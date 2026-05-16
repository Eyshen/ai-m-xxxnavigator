import pandas as pd
from collections import Counter

from utils import generate_csv_profiling_for_llm, get_tree_via_seedir, load_agent_prompts, clean_and_parse_json

from utils import extract_code, execute_code_with_uv, remove_ansi_colors

import seedir as sd
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, TemplateNotFound

projects_dir = "./workspace_input/test_project"

project_info = {}
project_info['dir'] = projects_dir


tree_str = get_tree_via_seedir(project_info['dir'])
project_info['file_tree_structure'] = tree_str

# 将目录路径转化为 Path 对象以便搜索
base_path = Path(project_info['dir'])
desc_file = next(base_path.rglob('description.md'), None)

if desc_file and desc_file.is_file():
    project_info['competition_desc'] = desc_file.read_text(encoding='utf-8')
else:
    project_info['competition_desc'] = "未找到 description.md 文件" 

csv_paths = list(base_path.rglob('*.csv'))
project_info['csv_files'] = {
    k: generate_csv_profiling_for_llm(str(base_path / k)) for k in sorted(str(csv_file.relative_to(base_path)) for csv_file in csv_paths)
}

project_info['csv_file_desc'] = "\n\n".join([k for k in project_info['csv_files'].values()])

import json
from llm_manager import LLMManager
analyst_agent = LLMManager()
agent_dir = "./agents/agent_analyst"
prompts = load_agent_prompts(agent_dir)
system_prompt = prompts.get('system').render()
user_prompt = prompts.get('user').render(**project_info)


analyst_agent.clear_history()
analyst_agent.set_system_prompt(system_prompt)
analyst_agent.add_human_message(user_prompt)
llm = analyst_agent.get_llm()
response = llm.invoke(analyst_agent.get_chat_history())
analyst_agent.add_ai_message(response.content)
project_info['competition_desc_compiled'] = clean_and_parse_json(response.content)

import logging
import json
import sqlite3
import datetime   
import re         
from llm_manager import LLMManager

experiment_name = "test_experiment"

# 1. 配置文件日志
logging.basicConfig(
    filename=f'./logs/{experiment_name}.log',    # 日志文件的路径
    filemode='w',                
    level=logging.INFO,          
    format='%(asctime)s | %(levelname)s | %(message)s', 
    encoding='utf-8'             
)

# 2. 配置并初始化 SQLite 数据库
db_path = f'./logs/{experiment_name}.db'
db_conn = sqlite3.connect(db_path)
db_cursor = db_conn.cursor()

# 创建表（如果不存在）：包含 id, round_idx, agent_name, output 和 timestamp
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

# 定义一个辅助函数，用于快速将日志存入数据库
def log_to_db(round_idx, agent_name, output):
    if isinstance(output, (dict, list)):
        output_str = json.dumps(output, ensure_ascii=False)
    else:
        output_str = str(output)

    db_cursor.execute('''
        INSERT INTO agent_logs (round_idx, agent_name, output)
        VALUES (?, ?, ?)
    ''', (round_idx, agent_name, output_str))
    db_conn.commit()

experimeent_round = 5
logs_history = []
round_idx = 1
max_debug_round = 3

meta_agent = LLMManager()
reseracher_agent = LLMManager()
coder_agent = LLMManager()
summary_agent = LLMManager()

for idx in range(experimeent_round):
    round_idx = idx + 1
    print("="*20, f"round {round_idx}", "="*20)
    agent_dir = "./agents/agent_meta"
    prompts = load_agent_prompts(agent_dir)
    system_prompt = prompts.get('system').render()

    user_prompt = prompts.get('user').render(**project_info, logs_history = json.dumps(logs_history, ensure_ascii = False))
    meta_agent.clear_history()
    meta_agent.set_system_prompt(system_prompt)
    meta_agent.add_human_message(user_prompt)

    llm = meta_agent.get_llm()
    response = llm.invoke(meta_agent.get_chat_history())
    meta_agent.add_ai_message(response.content)
    log_to_db(round_idx, 'meta', response.content)
    logging.info(f"Round {round_idx}: meta 返回结果:\n{response.content}")
    meta_controller = clean_and_parse_json(response.content)

    # 构建当前轮的结构体
    round_log = {
        "loop_id": round_idx,
        # 假设你的 project_info 是在外部定义的全局字典
        "scenario": project_info.get("scenario", "Data Science / Risk Control") if 'project_info' in globals() else "Data Science / Risk Control",
        "task": project_info.get("task", "Bank Fraud Transfer Detection") if 'project_info' in globals() else "Bank Fraud Transfer Detection",
        "status": "Running",
        "timestamp": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "meta_controller": meta_controller.copy(),
        "research": {},
        "development": {
            "total_evolutions": 0,
            "evolving_steps": []
        },
        "evaluation": {}
    }

    # ----------------- Researcher 阶段 -----------------
    agent_dir = "./agents/agent_researcher"
    prompts = load_agent_prompts(agent_dir)
    system_prompt = prompts.get('system').render()

    user_prompt = prompts.get('user').render(**project_info, logs_history = json.dumps(logs_history, ensure_ascii = False))
    reseracher_agent.clear_history()

    reseracher_agent.set_system_prompt(system_prompt)
    reseracher_agent.add_human_message(user_prompt)

    llm = reseracher_agent.get_llm()
    response = llm.invoke(reseracher_agent.get_chat_history())
    reseracher_agent.add_ai_message(response.content)

    logging.info(f"Round {round_idx}: researcher 返回结果:\n{response.content}")
    log_to_db(round_idx, 'researcher', response.content)

    hypothesis = clean_and_parse_json(response.content)
    # ### 修改：将 Hypothesis 结果直接赋给 research 节点 ###
    round_log['research'] = hypothesis

    # ----------------- Coder 阶段 -----------------
    agent_dir = "./agents/agent_coder"
    prompts = load_agent_prompts(agent_dir)
    system_prompt = prompts.get('system').render()
    user_prompt = prompts.get('user').render(**project_info, logs_history = json.dumps(logs_history, ensure_ascii = False), hypothesis = hypothesis)

    coder_agent.clear_history()
    coder_agent.set_system_prompt(system_prompt)
    coder_agent.add_human_message(user_prompt)

    llm = coder_agent.get_llm()
    response = llm.invoke(coder_agent.get_chat_history())
    coder_agent.add_ai_message(response.content)

    # ### 修改：增加 evolving_steps 收集代码迭代过程 ###
    evolving_steps = []
    step_id = 1

    code = extract_code(response.content)
    running_result = execute_code_with_uv(code)

    # 粗略提取首次生成代码时的 Agent 反思（不包含代码块的部分）
    agent_reflection = response.content.split("```")[0].strip()

    evolving_steps.append({
        "step_id": step_id,
        "action": "Implement initial code",
        "code": code,
        "execution_status": "Success" if running_result.get('success') else "Failed",
        "execution_log": running_result.get('stdout', '') if running_result.get('success') else running_result.get('stderr', ''),
        "agent_reflection": agent_reflection
    })

    debug_count = 0
    while debug_count < max_debug_round and not running_result['success']:
        debug_count += 1
        print("debug_count: ", debug_count)
        print(running_result['stderr'])
        running_result['stderr'] = remove_ansi_colors(running_result['stderr'])
        user_prompt = f"执行结果为：{json.dumps(running_result)}\n修改一下代码，并输出完整修改后的代码。"
        coder_agent.add_human_message(user_prompt)

        llm = coder_agent.get_llm()
        response = llm.invoke(coder_agent.get_chat_history())
        coder_agent.add_ai_message(response.content)

        code = extract_code(response.content)
        running_result = execute_code_with_uv(code)

        step_id += 1
        agent_reflection = response.content.split("```")[0].strip()

        evolving_steps.append({
            "step_id": step_id,
            "action": f"Fix execution error (Debug Round {debug_count})",
            "code": code,
            "execution_status": "Success" if running_result.get('success') else "Failed",
            "execution_log": running_result.get('stdout', '') if running_result.get('success') else running_result.get('stderr', ''),
            "agent_reflection": agent_reflection
        })

    code_result = {
        "code" : code, 
        "running_result" : running_result
    }

    # ### 修改：将 Coder 多次调用的结果保存至外层结构中 ###
    round_log['development']['total_evolutions'] = step_id
    round_log['development']['evolving_steps'] = evolving_steps
    round_log['status'] = "Success" if running_result.get('success') else "Failed"

    logging.info(f"Round {round_idx}: coder 返回:\n{code_result} , debug_count : {debug_count}")
    log_to_db(round_idx, 'coder', code_result)

    # ----------------- Summary 阶段 -----------------
    agent_dir = "./agents/agent_summary"
    prompts = load_agent_prompts(agent_dir)
    system_prompt = prompts.get('system').render()
    user_prompt = prompts.get('user').render(**project_info, logs_history = json.dumps(logs_history, ensure_ascii = False), hypothesis = hypothesis, code = code, result = running_result)

    summary_agent.clear_history()
    summary_agent.set_system_prompt(system_prompt)
    summary_agent.add_human_message(user_prompt)

    llm = summary_agent.get_llm()
    response = llm.invoke(summary_agent.get_chat_history())
    summary_agent.add_ai_message(response.content)
    summary = clean_and_parse_json(response.content)

    logging.info(f"Round {round_idx}: summary 返回结果:\n{json.dumps(summary,ensure_ascii = False)}")
    log_to_db(round_idx, 'summary', summary)

    # ### 修改：将 Summary 结果存入 evaluation，并完成外层日志保存 ###
    round_log['evaluation'] = summary
    logs_history.append(round_log.copy())

    # 附加功能：将整体格式化完毕后的 json 数据也沉淀到 SQLite，以便后续直接查看
    log_to_db(round_idx, 'round_log_final', round_log)

db_conn.close()

