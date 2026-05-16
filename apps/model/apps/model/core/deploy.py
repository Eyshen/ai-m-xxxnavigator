import json
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# 导入你原有的依赖和工具函数
import pandas as pd
from collections import Counter
from utils import (
    generate_csv_profiling_for_llm, 
    get_tree_via_seedir, 
    load_agent_prompts, 
    clean_and_parse_json,
    extract_code, 
    execute_code_with_uv, 
    remove_ansi_colors
)
from llm_manager import LLMManager

# 1. 初始化 FastAPI 应用
app = FastAPI(
    title="LLM Agent Deployment Server",
    description="自动生成、调试并部署模型代码的 API",
    version="1.0.0"
)

# 2. 定义请求和响应的数据模型 (Pydantic)
class DeployRequest(BaseModel):
    file_name: str = Field(..., description="保存模型的文件夹路径")
    best_experiment_code: str = Field(..., description="最佳实验代码")
    best_experiment_log: str = Field(..., description="最佳实验输出日志")

class DeployResponse(BaseModel):
    deploy_status: str
    model_folder: str
    train_code: str
    infra_code: str
    message: str = ""

# 3. 编写 API 路由接口
# 注意：这里使用 def 而不是 async def，以防同步的LLM请求或UV执行阻塞事件循环
@app.post("/api/v1/deploy", response_model=DeployResponse)
def generate_and_deploy_model(request: DeployRequest):
    try:
        # --- 初始化 Agent ---
        agent_deploy = LLMManager()
        agent_dir = "./agents/agent_deployer"
        prompts = load_agent_prompts(agent_dir)

        system_prompt = prompts.get('system').render()
        user_prompt = prompts.get('user').render(
            save_directory=request.file_name, 
            experiment_code=request.best_experiment_code, 
            experiment_output=request.best_experiment_log
        )

        agent_deploy.clear_history()
        agent_deploy.set_system_prompt(system_prompt)
        agent_deploy.add_human_message(user_prompt)

        llm = agent_deploy.get_llm()

        # --- 第一次生成训练代码并执行 ---
        response = llm.invoke(agent_deploy.get_chat_history())
        agent_deploy.add_ai_message(response.content)

        train_code = extract_code(response.content)
        running_result = execute_code_with_uv(train_code)

        # --- Debug 循环 ---
        max_debug_round = 3
        debug_count = 0

        while debug_count < max_debug_round and not running_result.get('success', False):
            debug_count += 1
            print(f"[Debug Round {debug_count}] Code execution failed.")

            # 清理控制台颜色符，避免干扰LLM
            stderr_clean = remove_ansi_colors(running_result.get('stderr', ''))
            running_result['stderr'] = stderr_clean

            debug_prompt = f"执行结果为：{json.dumps(running_result)}\n修改一下代码，并输出完整修改后的代码。"
            agent_deploy.add_human_message(debug_prompt)

            # 请求大模型修复代码
            response = llm.invoke(agent_deploy.get_chat_history())
            agent_deploy.add_ai_message(response.content)

            train_code = extract_code(response.content)
            running_result = execute_code_with_uv(train_code)

        # --- 判断 Debug 结束后是否成功 ---
        if not running_result.get('success', False):
            # 如果三次 debug 依然失败，提前返回失败信息，不进行部署
            return DeployResponse(
                deploy_status="Failed",
                model_folder=request.file_name,
                train_code=train_code,
                infra_code="",
                message=f"Train code execution failed after {max_debug_round} debug attempts."
            )

        # --- 生成部署代码 ---
        deploy_prompt = "目前模型已经训练和保存好了，请按要求写一段部署的python代码。"
        agent_deploy.add_human_message(deploy_prompt)

        response = llm.invoke(agent_deploy.get_chat_history())
        agent_deploy.add_ai_message(response.content)

        infra_code = extract_code(response.content)

        # --- 返回成功结果 ---
        return DeployResponse(
            deploy_status="Success",
            model_folder=request.file_name,
            train_code=train_code,
            infra_code=infra_code,
            message="Successfully trained model and generated deployment code."
        )

    except Exception as e:
        # 捕捉异常并返回 500 错误
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

# 4. 启动入口
if __name__ == "__main__":
    # 使用 Uvicorn 启动应用
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)