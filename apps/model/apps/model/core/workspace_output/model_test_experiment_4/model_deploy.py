import os
import gc
import warnings
import numpy as np
import pandas as pd
import joblib
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

warnings.filterwarnings('ignore')

# 模型及预处理器保存路径（与训练代码保持一致）
SAVE_DIR = "./workspace_output/model_test_experiment_4"
MODEL_PATH = os.path.join(SAVE_DIR, "model_artifacts.pkl")

app = FastAPI(title="Fraud Detection Inference API", version="1.0.0", description="LightGBM 欺诈检测在线推理服务")

# 全局缓存：服务启动时加载一次，避免每次请求重复IO
model_artifacts = None

class PredictionRequest(BaseModel):
    data: List[Dict[str, Any]] = Field(..., description="待预测的交易数据列表，每个字典代表一条原始记录")

class PredictionResponse(BaseModel):
    status: str
    predictions: List[float]
    message: str = ""

@app.on_event("startup")
def load_resources():
    """服务启动时加载模型与预处理状态"""
    global model_artifacts
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(f"❌ 模型文件未找到: {MODEL_PATH}")
    try:
        model_artifacts = joblib.load(MODEL_PATH)
        print("✅ 模型与预处理状态加载成功，服务就绪。")
    except Exception as e:
        raise RuntimeError(f"❌ 模型加载失败: {str(e)}")

def preprocess_inference(df: pd.DataFrame, state: Dict[str, Any]) -> pd.DataFrame:
    """
    推理期数据预处理。
    ⚠️ 注意：训练期使用了 expanding() 时序聚合与 Target Encoding，依赖完整历史序列。
    在无状态 API 场景下，采用生产标准降级策略：
    - TE 特征：使用训练期全局均值填充
    - 聚合特征：使用当前行 TransactionAmt 或默认值填充
    - 类别编码：严格对齐训练期映射表，未知类别映射至末尾
    """
    # 1. 基础排序与时间列处理
    if 'TransactionDT' not in df.columns:
        df['TransactionDT'] = 0
    df = df.sort_values('TransactionDT').reset_index(drop=True)

    # 2. 目标编码降级 (Target Encoding)
    for col in state['te_cols']:
        df[f'{col}_te'] = state['global_mean']

    # 3. 聚合特征降级 (Aggregation)
    if 'TransactionAmt' in df.columns:
        df['TransactionAmt'] = pd.to_numeric(df['TransactionAmt'], errors='coerce').fillna(0.0)
        for agg in ['mean', 'std', 'min', 'max']:
            df[f'card1_amt_{agg}'] = df['TransactionAmt']
        df['card1_amt_count'] = 1.0
    else:
        for agg in ['mean', 'std', 'min', 'max', 'count']:
            df[f'card1_amt_{agg}'] = 0.0

    # 4. 类别特征安全编码 (Category Encoding)
    for col in state['cat_cols']:
        if col in df.columns:
            known_cats = state['cat_mappings'].get(col, [])
            df[col] = df[col].fillna('__missing__').astype('category')
            df[col] = df[col].cat.set_categories(known_cats, ordered=False)
            df[col] = df[col].cat.codes.astype('int32')
            # 训练期未出现的类别统一映射到最后一个索引
            df.loc[df[col] == -1, col] = len(known_cats)
        else:
            # 缺失列补默认值（类别总数）
            df[col] = len(state['cat_mappings'].get(col, []))

    # 5. 内存压缩对齐 (Memory Reduction)
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            c_min, c_max = df[col].min(), df[col].max()
            if pd.api.types.is_integer_dtype(df[col]):
                if c_min > np.iinfo(np.int8).min and c_max < np.iinfo(np.int8).max: df[col] = df[col].astype(np.int8)
                elif c_min > np.iinfo(np.int16).min and c_max < np.iinfo(np.int16).max: df[col] = df[col].astype(np.int16)
                elif c_min > np.iinfo(np.int32).min and c_max < np.iinfo(np.int32).max: df[col] = df[col].astype(np.int32)
            else:
                if c_min > np.finfo(np.float32).min and c_max < np.finfo(np.float32).max: df[col] = df[col].astype(np.float32)
                
    gc.collect()
    return df

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """接收原始交易数据，返回欺诈概率"""
    try:
        if model_artifacts is None:
            raise HTTPException(status_code=503, detail="服务未就绪：模型尚未加载")

        df = pd.DataFrame(request.data)
        if df.empty:
            raise HTTPException(status_code=400, detail="输入数据为空")

        # 执行与训练一致的预处理逻辑
        df_processed = preprocess_inference(df, model_artifacts['state'])

        # 严格对齐训练期特征列（缺失补0，多余丢弃，保证模型输入维度一致）
        X = pd.DataFrame(0, index=df_processed.index, columns=model_artifacts['features'])
        for col in model_artifacts['features']:
            if col in df_processed.columns:
                X[col] = df_processed[col]

        # 模型推理
        probs = model_artifacts['model'].predict_proba(X)[:, 1].tolist()

        return PredictionResponse(status="success", predictions=probs)
    except HTTPException as he:
        raise he
    except Exception as e:
        # 捕获所有未预期异常，返回标准错误格式
        raise HTTPException(status_code=500, detail=f"推理失败: {str(e)}")

# 启动命令示例: uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4