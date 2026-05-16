import json
import sqlite3
import datetime
import logging
import re
from pathlib import Path
from collections import Counter
from typing import List, Optional

from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel

# 导入你原有的自定义模块
import pandas as pd
import seedir as sd
from jinja2 import Environment, FileSystemLoader, TemplateNotFound

from utils import (
    generate_csv_profiling_for_llm, get_tree_via_seedir, load_agent_prompts, 
    clean_and_parse_json, extract_code, execute_code_with_uv, remove_ansi_colors
)
from llm_manager import LLMManager

app = FastAPI(title="Multi-Agent Workflow API", description="Automated Data Science Agent System")

# =========================
# 1. 定义请求和响应的数据模型 (Pydantic)
# =========================
class ExperimentRequest(BaseModel):
    experiment_name: str = "test_experiment"
    projects_dir: str = "./workspace_input/test_project"
    experiment_round: int = 5
    max_debug_round: int = 3

class LogResponse(BaseModel):
    id: int
    round_idx: int
    agent_name: str
    output: str
    timestamp: str

# =========================
# 2. 核心工作流逻辑 (封装为独立函数供后台调用)
# =========================
def run_agent_workflow(req: ExperimentRequest):
    experiment_name = req.experiment_name

    # 1. 配置文件日志
    Path('./logs').mkdir(parents=True, exist_ok=True)
    log_file = f'./logs/{experiment_name}.log'

    # 创建独立的 logger 避免并发请求日志冲突
    logger = logging.getLogger(experiment_name)
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        fh = logging.FileHandler(log_file, mode='w', encoding='utf-8')
        fh.setFormatter(logging.Formatter('%(asctime)s | %(levelname)s | %(message)s'))
        logger.addHandler(fh)

    # 2. 配置并初始化 SQLite 数据库 (数据库连接要在线程内部创建)
    db_path = f'./logs/{experiment_name}.db'
    db_conn = sqlite3.connect(db_path)
    db_cursor = db_conn.cursor()

    db_cursor.execute('''
        CREATE TABLE IF NOT EXISTS agent_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            round_idx INTEGER,
            agent_name TEXT,
            output TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    db_conn.commit()

    def log_to_db(round_idx, agent_name, output):
        output_str = json.dumps(output, ensure_ascii=False) if isinstance(output, (dict, list)) else str(output)
        db_cursor.execute('''
            INSERT INTO agent_logs (round_idx, agent_name, output)
            VALUES (?, ?, ?)
        ''', (round_idx, agent_name, output_str))
        db_conn.commit()

    try:
        # ----------------- 准备项目信息 -----------------
        project_info = {}
        project_info['dir'] = req.projects_dir
        project_info['file_tree_structure'] = get_tree_via_seedir(project_info['dir'])

        base_path = Path(project_info['dir'])
        desc_file = next(base_path.rglob('description.md'), None)
        project_info['competition_desc'] = desc_file.read_text(encoding='utf-8') if desc_file and desc_file.is_file() else "未找到 description.md 文件" 

        csv_paths = list(base_path.rglob('*.csv'))
        project_info['csv_files'] = {
            k: generate_csv_profiling_for_llm(str(base_path / k)) for k in sorted(str(csv_file.relative_to(base_path)) for csv_file in csv_paths)
        }
        project_info['csv_file_desc'] = "\n\n".join(project_info['csv_files'].values())

        # ----------------- Analyst Agent 初始化 -----------------
        analyst_agent = LLMManager()
        agent_dir = "./agents/agent_analyst"
        prompts = load_agent_prompts(agent_dir)

        analyst_agent.clear_history()
        analyst_agent.set_system_prompt(prompts.get('system').render())
        analyst_agent.add_human_message(prompts.get('user').render(**project_info))

        response = analyst_agent.get_llm().invoke(analyst_agent.get_chat_history())
        analyst_agent.add_ai_message(response.content)
        project_info['competition_desc_compiled'] = clean_and_parse_json(response.content)

        # ----------------- 循环迭代阶段 -----------------
        logs_history = []
        meta_agent = LLMManager()
        reseracher_agent = LLMManager()
        coder_agent = LLMManager()
        summary_agent = LLMManager()

        for idx in range(req.experiment_round):
            round_idx = idx + 1
            logger.info(f"==================== round {round_idx} ====================")

            # --- Meta ---
            meta_agent.clear_history()
            prompts = load_agent_prompts("./agents/agent_meta")
            meta_agent.set_system_prompt(prompts.get('system').render())
            meta_agent.add_human_message(prompts.get('user').render(**project_info, logs_history=json.dumps(logs_history, ensure_ascii=False)))

            response = meta_agent.get_llm().invoke(meta_agent.get_chat_history())
            meta_agent.add_ai_message(response.content)
            log_to_db(round_idx, 'meta', response.content)
            logger.info(f"Round {round_idx}: meta 返回结果:\n{response.content}")
            meta_controller = clean_and_parse_json(response.content)

            round_log = {
                "loop_id": round_idx,
                "scenario": project_info.get("scenario", "Data Science / Risk Control"),
                "task": project_info.get("task", "Bank Fraud Transfer Detection"),
                "status": "Running",
                "timestamp": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "meta_controller": meta_controller.copy(),
                "research": {},
                "development": {"total_evolutions": 0, "evolving_steps": []},
                "evaluation": {}
            }

            # --- Researcher ---
            reseracher_agent.clear_history()
            prompts = load_agent_prompts("./agents/agent_researcher")
            reseracher_agent.set_system_prompt(prompts.get('system').render())
            reseracher_agent.add_human_message(prompts.get('user').render(**project_info, logs_history=json.dumps(logs_history, ensure_ascii=False)))

            response = reseracher_agent.get_llm().invoke(reseracher_agent.get_chat_history())
            reseracher_agent.add_ai_message(response.content)
            logger.info(f"Round {round_idx}: researcher 返回结果:\n{response.content}")
            log_to_db(round_idx, 'researcher', response.content)

            hypothesis = clean_and_parse_json(response.content)
            round_log['research'] = hypothesis

            # --- Coder ---
            coder_agent.clear_history()
            prompts = load_agent_prompts("./agents/agent_coder")
            coder_agent.set_system_prompt(prompts.get('system').render())
            coder_agent.add_human_message(prompts.get('user').render(**project_info, logs_history=json.dumps(logs_history, ensure_ascii=False), hypothesis=hypothesis))

            response = coder_agent.get_llm().invoke(coder_agent.get_chat_history())
            coder_agent.add_ai_message(response.content)

            evolving_steps = []
            step_id = 1
            code = extract_code(response.content)
            running_result = execute_code_with_uv(code)
            agent_reflection = response.content.split("```")[0].strip()

            evolving_steps.append({
                "step_id": step_id, "action": "Implement initial code", "code": code,
                "execution_status": "Success" if running_result.get('success') else "Failed",
                "execution_log": running_result.get('stdout', '') if running_result.get('success') else running_result.get('stderr', ''),
                "agent_reflection": agent_reflection
            })

            debug_count = 0
            while debug_count < req.max_debug_round and not running_result['success']:
                debug_count += 1
                running_result['stderr'] = remove_ansi_colors(running_result['stderr'])
                coder_agent.add_human_message(f"执行结果为：{json.dumps(running_result)}\n修改一下代码，并输出完整修改后的代码。")

                response = coder_agent.get_llm().invoke(coder_agent.get_chat_history())
                coder_agent.add_ai_message(response.content)
                code = extract_code(response.content)
                running_result = execute_code_with_uv(code)
                step_id += 1
                agent_reflection = response.content.split("```")[0].strip()

                evolving_steps.append({
                    "step_id": step_id, "action": f"Fix execution error (Debug Round {debug_count})", "code": code,
                    "execution_status": "Success" if running_result.get('success') else "Failed",
                    "execution_log": running_result.get('stdout', '') if running_result.get('success') else running_result.get('stderr', ''),
                    "agent_reflection": agent_reflection
                })

            round_log['development']['total_evolutions'] = step_id
            round_log['development']['evolving_steps'] = evolving_steps
            round_log['status'] = "Success" if running_result.get('success') else "Failed"

            code_result = {"code": code, "running_result": running_result}
            logger.info(f"Round {round_idx}: coder 返回:\n{code_result} , debug_count : {debug_count}")
            log_to_db(round_idx, 'coder', code_result)

            # --- Summary ---
            summary_agent.clear_history()
            prompts = load_agent_prompts("./agents/agent_summary")
            summary_agent.set_system_prompt(prompts.get('system').render())
            summary_agent.add_human_message(prompts.get('user').render(**project_info, logs_history=json.dumps(logs_history, ensure_ascii=False), hypothesis=hypothesis, code=code, result=running_result))

            response = summary_agent.get_llm().invoke(summary_agent.get_chat_history())
            summary_agent.add_ai_message(response.content)
            summary = clean_and_parse_json(response.content)

            logger.info(f"Round {round_idx}: summary 返回结果:\n{json.dumps(summary,ensure_ascii=False)}")
            log_to_db(round_idx, 'summary', summary)

            round_log['evaluation'] = summary
            logs_history.append(round_log.copy())
            log_to_db(round_idx, 'round_log_final', round_log)

    except Exception as e:
        logger.error(f"Experiment failed: {str(e)}", exc_info=True)
    finally:
        db_conn.close()


# =========================
# 3. FastAPI 路由定义
# =========================

@app.post("/api/experiment/start")
async def start_experiment(req: ExperimentRequest, background_tasks: BackgroundTasks):
    """
    启动一个新的实验任务（后台异步执行，防止请求超时）
    """
    # 将任务加入后台队列
    background_tasks.add_task(run_agent_workflow, req)
    return {
        "status": "Task Started",
        "message": f"Experiment '{req.experiment_name}' is running in the background.",
        "parameters": req.dict()
    }

@app.get("/api/experiment/{experiment_name}/logs", response_model=List[LogResponse])
async def get_experiment_logs(experiment_name: str, limit: int = 100):
    """
    从 SQLite 数据库中查询对应实验的执行日志
    """
    db_path = f'./logs/{experiment_name}.db'
    if not Path(db_path).exists():
        raise HTTPException(status_code=404, detail="Experiment database not found.")

    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM agent_logs ORDER BY id DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()

        # 将 sqlite.Row 转换为字典返回
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/api/experiment/{experiment_name}/result")
async def get_experiment_final_results(experiment_name: str):
    """
    专门提取每个 round 最终聚合好的 `round_log_final`
    """
    db_path = f'./logs/{experiment_name}.db'
    if not Path(db_path).exists():
        raise HTTPException(status_code=404, detail="Experiment database not found.")

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT round_idx, output, timestamp FROM agent_logs WHERE agent_name = 'round_log_final' ORDER BY round_idx ASC")
        rows = cursor.fetchall()

        results = []
        for row in rows:
            results.append({
                "round_idx": row[0],
                "round_log": json.loads(row[1]), # 解析存入的 JSON 字符串
                "timestamp": row[2]
            })
        return {"experiment_name": experiment_name, "rounds_completed": len(results), "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    # 本地启动测试
    uvicorn.run(app, host="0.0.0.0", port=8000)