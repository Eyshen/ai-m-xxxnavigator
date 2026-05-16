
import pandas as pd
from collections import Counter
import seedir as sd
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, TemplateNotFound
import re
import subprocess
import tempfile
import os
import json

def generate_csv_profiling_for_llm(file_path: str, max_enum_classes: int = 15, max_cols_to_show: int = 20) -> str:
    """
    读取 CSV 文件并生成适合大模型阅读的字段描述文本。
    增加了超宽表（列数过多）的折叠降维保护机制，防止 Token 溢出。
    
    :param file_path: CSV 文件路径
    :param max_enum_classes: 当唯一值数量小于等于此阈值时，视作枚举(类别)变量并列出所有可能值
    :param max_cols_to_show: 允许向大模型展示详情的最大列数，超出的列将被折叠
    :return: 格式化好的 Markdown/Text 字符串
    """
    try:
        # 只读前10万行做采样，防止内存溢出和计算过慢
        df = pd.read_csv(file_path)
    except Exception as e:
        return f"读取文件 {file_path} 失败: {str(e)}"
    
    total_rows, total_cols = df.shape
    
    # 总体信息
    profiling_text = f"### 文件: `{file_path}`\n"
    profiling_text += f"- **总行数 (Rows)**: {total_rows} (当前基于最多 100,000 行采样)\n"
    profiling_text += f"- **总列数 (Columns)**: {total_cols}\n\n"
    
    # 决定要展示详情的列
    if total_cols <= max_cols_to_show:
        cols_to_profile = list(df.columns)
        skipped_cols = []
    else:
        # 如果列数过多，只取前后各一半的列展示详情
        half = max_cols_to_show // 2
        cols_to_profile = list(df.columns[:half]) + list(df.columns[-half:])
        skipped_cols = list(df.columns[half:-half])
        profiling_text += f"*(注：由于该表特征列高达 {total_cols} 列，为防信息过载，以下仅展示前 {half} 列与后 {half} 列的详细信息，中间 {len(skipped_cols)} 列已被折叠。)*\n\n"

    profiling_text += "#### 字段详情:\n"
    
    # 逐列分析
    for idx, col in enumerate(cols_to_profile):
        # 插入折叠提示符（在打印完前半部分后）
        if skipped_cols and idx == max_cols_to_show // 2:
            profiling_text += f"  ...\n  ... [已折叠中间的 {len(skipped_cols)} 个列] ...\n  ...\n\n"
            
        col_data = df[col]
        dtype = str(col_data.dtype)
        
        # 1. 缺失值计算
        missing_count = int(col_data.isnull().sum())
        missing_ratio = missing_count / total_rows if total_rows > 0 else 0
        
        # 2. 唯一值计算
        nunique = int(col_data.nunique())
        
        # 3. 提取非空样本 (用 list 包裹防报错，替换非法 float 甚至可以截断长文本)
        samples = col_data.dropna().head(3).tolist()
        # 对部分极长文本样本做阶段，防止把 Prompt 撑爆
        samples = [str(s)[:100] + "..." if len(str(s)) > 100 else s for s in samples]
        
        # 拼接单列基础描述
        profiling_text += f"- **`{col}`** (Type: `{dtype}`)\n"
        profiling_text += f"  - 缺失值: {missing_count} ({missing_ratio:.2%}), 唯一值数量: {nunique}\n"
        
        # 4. 枚举值处理 (Categorical)
        if nunique <= max_enum_classes and nunique > 0:
            unique_values = col_data.dropna().unique().tolist()
            profiling_text += f"  - 枚举值 (Enums): {unique_values}\n"
        elif dtype == 'object' or dtype == 'bool' or dtype == 'string':
            profiling_text += f"  - 特性: 高基数文本/类别型特征 (High cardinality categorical)\n"
        
        # 补充样本数据展示
        profiling_text += f"  - 数据样本: {samples}\n\n"
        
    # 如果有列被折叠，向大模型提供被折叠列的统计摘要
    if skipped_cols:
        profiling_text += "#### 被折叠列的数据类型统计:\n"
        skipped_dtypes = [str(df[c].dtype) for c in skipped_cols]
        dtype_counts = Counter(skipped_dtypes)
        for dt, count in dtype_counts.items():
            profiling_text += f"- `{dt}`: 共 {count} 列\n"
            
    return profiling_text

def get_tree_via_seedir(dir_path: str) -> str:
    tree_str = sd.seedir(
        dir_path, 
        style='lines',   
        printout=False,  
        exclude_folders=['.git', '__pycache__'] 
    )
    return tree_str

def load_agent_prompts(agent_dir: str):
    """
    从指定的 agent_dir 加载 system_prompt.txt 和 user_prompt.txt 作为 Jinja2 模板
    """
    dir_path = Path(agent_dir)
    
    # 检查目录是否存在
    if not dir_path.exists() or not dir_path.is_dir():
        raise NotADirectoryError(f"Agent 目录不存在: {dir_path.resolve()}")
    
    # 1. 创建 Jinja2 环境，将根目录设置为 agent_dir
    env = Environment(loader=FileSystemLoader(searchpath=dir_path))
    
    templates = {}
    
    # 2. 获取模板（附带友好的错误处理）
    try:
        templates['system'] = env.get_template("system_prompt.txt")
    except TemplateNotFound:
        print(f"⚠️ 警告: 在 {dir_path} 下未找到 system_prompt.txt")
        templates['system'] = None

    try:
        templates['user'] = env.get_template("user_prompt.txt")
    except TemplateNotFound:
        print(f"⚠️ 警告: 在 {dir_path} 下未找到 user_prompt.txt")
        templates['user'] = None
        
    return templates

def extract_code(llm_response: str) -> str:
    """
    从大模型回复的文本中提取 Python 代码。
    支持 ```python ... ``` 格式，并兼容缺少 python 标识的 ``` ... ``` 格式。
    
    参数:
        llm_response (str): 大模型返回的原始字符串
    返回:
        str: 提取出的纯 Python 代码
    """
    # 正则解释：匹配 ``` 或者 ```python 开始，非贪婪匹配中间的内容，直到下一个 ``` 结束
    pattern = re.compile(r"```(?:python)?\s*\n(.*?)\n\s*```", re.DOTALL | re.IGNORECASE)
    match = pattern.search(llm_response)
    
    if match:
        # 成功匹配到代码块，去除首尾多余的空白字符和换行
        return match.group(1).strip()
    
    # 兜底机制 (Fallback)：
    # 如果模型完全没有输出 ```（极少情况），但文本中包含明确的代码关键字
    if "import " in llm_response or "def " in llm_response:
        print("[Warning] 未检测到 Markdown 代码块标识，尝试返回全文。")
        return llm_response.strip()
    return ""

def execute_code_with_uv(code_string):
    """
    使用 uv 在隔离依赖环境中执行 Python 代码字符串，并捕获输出
    """
    # 1. 创建一个临时 Python 文件
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as temp_file:
        temp_file.write(code_string)
        temp_file_path = temp_file.name

    try:
        # 2. 构建 uv 运行命令
        # --with 参数让 uv 自动下载并创建一个包含这些包的临时隔离环境
        cmd = [
            "uv", "run",
            
            # === 1. 基础数据处理与科学计算 ===
            "--with", "numpy",
            "--with", "pandas",
            "--with", "polars",         # 可选：目前非常流行的高性能 DataFrame 库
            "--with", "scipy",          # 科学计算基础，很多算法的底层依赖
            "--with", "pyarrow",        # 极度推荐：Pandas/Polars 读取 Parquet 格式数据必备
            
            # === 2. 机器学习算法库（全家桶） ===
            "--with", "scikit-learn",   # 基础 ML 工具箱（评估指标、数据划分、基础模型等）
            "--with", "lightgbm",       # 微软开源的梯度提升树（高效）
            "--with", "xgboost",        # 经典的梯度提升树（极其常用）
            "--with", "catboost",       # Yandex开源的梯度提升树（处理类别特征极强）
            
            # === 3. 超参数优化与框架集成 ===
            "--with", "optuna",         # Optuna 核心库
            "--with", "optuna-integration", # ⚠️非常重要：Optuna 3.0 之后，XGBoost/LightGBM/CatBoost 的提前停止（Pruning）回调函数都被移到了这个独立的包里
            
            # === 4. 可视化与模型解释 ===
            "--with", "seaborn",        # 高级统计绘图库
            "--with", "shap",           # 极度推荐：树模型特征重要性分析和可解释性分析神器
            
            # === 5. 序列化与并行计算 ===
            "--with", "joblib",         # 保存/加载 scikit-learn 和 Optuna 模型的常用库
            
            # === 临时脚本路径 ===
            temp_file_path
        ]
        
        print("🚀 正在启动 uv 隔离环境并执行代码 (可能需要几秒钟下载依赖)...\n")
        
        # 3. 使用 subprocess 执行，并捕获输出
        # capture_output=True 会同时捕获 stdout 和 stderr
        # text=True 会直接将字节流解码为字符串
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # 4. 组装返回结果
        return {
            "success": result.returncode == 0,
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr
        }
        
    finally:
        # 5. 清理临时文件，保持干净
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

def remove_ansi_colors(text: str) -> str:
    """去除字符串中的 ANSI 颜色转义字符"""
    if not text:
        return text
    # 匹配 ANSI 转义序列的标准正则表达式
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)

def clean_and_parse_json(text):
    # 移除 markdown 的 ```json 和 ``` 标记
    text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"error": "JSON 解析失败"}
