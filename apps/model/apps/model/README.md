# 自动化实验

本项目为一个基于 FastAPI 的多智能体自动化数据科学工作流，对底层运行环境有以下核心要求：

## 1. 核心系统环境

*   **Python (推荐 >= 3.10)**
    系统需要全局配置好 Python 环境。项目依赖较新的 Python 类型提示（Type Hints）以及 FastAPI 的异步（Async）特性来处理长时间运行的 Agent 任务。
*   **uv (Astral 极速包管理器)**
    **必需要求**。系统必须全局可用 `uv` 命令行工具。代码中的 `Coder Agent` 深度依赖项目内的 `execute_code_with_uv` 工具函数，该函数利用 `uv` 来进行极速的虚拟环境创建、依赖解析以及 AI 生成代码的安全沙箱执行。如果缺少 `uv`，代码迭代执行环节将直接失败。

# Multi-Agent Workflow API 接口文档

## 概述
本 API 服务用于驱动基于多智能体（Multi-Agent）的数据科学自动化工作流。由于工作流涉及多次 LLM 调用及代码本地执行，耗时较长，因此系统采用了**异步后台执行**的模式：
1. 调用「启动实验」接口提交任务。
2. 调用「查询日志」或「查询结果」接口轮询获取执行进度和最终结果。

**Base URL**: `http://127.0.0.1:8000` (根据实际部署情况替换)

---

## 1. 启动多智能体实验
**路径**: `/api/experiment/start`  
**请求方式**: `POST`  
**描述**: 提交一个实验任务，后端会将工作流放入后台异步执行，并立即返回任务启动状态。避免因执行时间过长导致 HTTP 请求超时。

### 请求头 (Headers)
| 参数名 | 值 |
| :--- | :--- |
| Content-Type | application/json |

### 请求体 (Body)
| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `experiment_name` | string | 否 | `"test_experiment"` | 实验名称，将作为日志文件和数据库(.db)的名称。推荐每次任务保持唯一。 |
| `projects_dir` | string | 否 | `"./workspace_input/test_project"` | 待分析的本地工程目录路径，需包含数据集和 `description.md`。 |
| `experiment_round` | integer| 否 | `5` | 实验迭代轮数 (Loop 数量)。 |
| `max_debug_round` | integer| 否 | `3` | Coder 节点代码执行失败时，最大允许重试修复(Debug)的次数。 |

**请求示例**:
```json
{
  "experiment_name": "fraud_detection_exp_01",
  "projects_dir": "./workspace_input/fraud_project",
  "experiment_round": 3,
  "max_debug_round": 3
}
```

### 响应数据 (Response)
**HTTP Status**: `200 OK`

**响应示例**:
```json
{
  "status": "Task Started",
  "message": "Experiment 'fraud_detection_exp_01' is running in the background.",
  "parameters": {
    "experiment_name": "fraud_detection_exp_01",
    "projects_dir": "./workspace_input/fraud_project",
    "experiment_round": 3,
    "max_debug_round": 3
  }
}
```

---

## 2. 查询实验执行日志
**路径**: `/api/experiment/{experiment_name}/logs`  
**请求方式**: `GET`  
**描述**: 从 SQLite 数据库中查询指定实验的各 Agent（Meta, Researcher, Coder, Summary）实时交互日志，可用于前端展示执行进度或控制台输出。

### 路径参数 (Path Parameters)
| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `experiment_name` | string | 是 | 启动实验时指定的 `experiment_name`。 |

### 查询参数 (Query Parameters)
| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `limit` | integer| 否 | `100` | 限制返回的日志条数（按时间倒序排列获取最新日志）。 |

**请求示例**:
`GET /api/experiment/fraud_detection_exp_01/logs?limit=50`

### 响应数据 (Response)
**HTTP Status**: `200 OK`

**响应示例**:
```json
[
  {
    "id": 15,
    "round_idx": 1,
    "agent_name": "coder",
    "output": "{\"code\": \"import pandas...\", \"running_result\": {\"success\": true}}",
    "timestamp": "2023-10-25 14:30:22"
  },
  {
    "id": 14,
    "round_idx": 1,
    "agent_name": "researcher",
    "output": "{\"hypothesis\": \"...\"}",
    "timestamp": "2023-10-25 14:28:10"
  }
]
```
*(注：当数据库不存在时，返回 HTTP 404)*

---

## 3. 查询实验最终结果 (Round Log)
**路径**: `/api/experiment/{experiment_name}/result`  
**请求方式**: `GET`  
**描述**: 提取经过清洗和聚合的每轮实验最终结果 `round_log_final`。该接口直接返回结构化的 JSON 数据，非常适合用于前端渲染报告、指标看板。

### 路径参数 (Path Parameters)
| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `experiment_name` | string | 是 | 启动实验时指定的 `experiment_name`。 |

**请求示例**:
`GET /api/experiment/fraud_detection_exp_01/result`

### 响应数据 (Response)
**HTTP Status**: `200 OK`

**响应示例**:
```json
{
  "experiment_name": "fraud_detection_exp_01",
  "rounds_completed": 1,
  "data": [
    {
      "round_idx": 1,
      "timestamp": "2023-10-25 14:32:11",
      "round_log": {
        "loop_id": 1,
        "scenario": "Data Science / Risk Control",
        "task": "Bank Fraud Transfer Detection",
        "status": "Success",
        "timestamp": "2023-10-25T14:25:00Z",
        "meta_controller": { ... },
        "research": { ... },
        "development": {
          "total_evolutions": 2,
          "evolving_steps": [
            {
              "step_id": 1,
              "action": "Implement initial code",
              "code": "...",
              "execution_status": "Failed",
              "agent_reflection": "..."
            },
            {
              "step_id": 2,
              "action": "Fix execution error (Debug Round 1)",
              "code": "...",
              "execution_status": "Success",
              "agent_reflection": "..."
            }
          ]
        },
        "evaluation": { ... }
      }
    }
  ]
}
```

---

## 全局错误码说明

| HTTP 状态码 | 含义 | 说明 |
| :--- | :--- | :--- |
| `400 Bad Request` | 请求参数错误 | 传入的 Body 格式不符合要求或缺少必填字段。 |
| `404 Not Found` | 资源未找到 | 通常在查询日志/结果时，传入了不存在的 `experiment_name`，对应的 SQLite 数据库文件未生成。 |
| `422 Unprocessable Entity` | 参数校验失败 | Pydantic 捕获到的参数类型错误。 |
| `500 Internal Server Error` | 服务器内部错误 | 读取数据库或反序列化 JSON 时发生异常。 |

## 💡 最佳前端集成实践
1. 前端点击“开始执行”按钮，发起 `POST /api/experiment/start` 请求。
2. 收到 `200` 响应后，前端进入 Loading 状态，或跳转至“执行面板”。
3. 开启定时器（如每 5 秒一次），轮询调用 `GET /api/experiment/{experiment_name}/logs` 获取最新日志并渲染到控制台界面。
4. 在轮询日志时，如果发现解析到了 `round_idx` 等于 `experiment_round` 且 `agent_name` 等于 `summary` 或 `round_log_final` 的日志，说明任务结束。
5. 任务结束后，调用 `GET /api/experiment/{experiment_name}/result` 获取完整的报告结构数据渲染图表和最终文档。

# 自动化模型训练与部署 API 文档

**接口描述**：  
基于大语言模型（LLM Agent），根据传入的最佳实验代码与日志，自动生成模型训练代码。接口会在后台使用 `uv` 环境执行代码，并在遇到报错时自动进行最多 3 次的 Debug 修复。训练代码执行成功后，会自动生成并返回模型部署阶段（Infra）的 Python 代码。

---

## 1. 接口基础信息

- **接口路径**：`/api/v1/deploy`
- **请求方式**：`POST`
- **Content-Type**：`application/json`

---

## 2. 请求参数 (Request Body)

| 参数名 | 类型 | 必填 | 描述 | 示例值 |
| :--- | :--- | :---: | :--- | :--- |
| `file_name` | String | 是 | 保存模型的文件夹路径。 | `"./models/v1"` |
| `best_experiment_code` | String | 是 | 实验阶段产出的最佳模型代码。 | `"import sklearn\n..."` |
| `best_experiment_log` | String | 是 | 实验阶段最佳代码运行输出的日志或结果。 | `"Accuracy: 0.98\nLoss: 0.12"` |

**请求体示例 (JSON)**：

```json
{
  "file_name": "./models/experiment_001",
  "best_experiment_code": "import pandas as pd\nfrom sklearn.ensemble import RandomForestClassifier\n...",
  "best_experiment_log": "Training completed. F1-Score: 0.95. Best params: {'n_estimators': 100}"
}
```

---

## 3. 响应参数 (Response Body)

| 参数名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `deploy_status` | String | 部署状态。枚举值：`"Success"`（成功）或 `"Failed"`（失败，通常因多次Debug未解决）。 |
| `model_folder` | String | 回传的模型文件夹路径，与请求参数中的 `file_name` 保持一致。 |
| `train_code` | String | Agent 最终生成且（如果成功）可执行的训练代码。 |
| `infra_code` | String | Agent 生成的部署（推理服务）Python代码。如果训练代码Debug失败，此字段为空字符串。 |
| `message` | String | 接口执行结果的文字说明提示。 |

### 3.1 成功响应示例 (HTTP Status 200)

```json
{
  "deploy_status": "Success",
  "model_folder": "./models/experiment_001",
  "train_code": "import pandas as pd\nimport joblib\n# ... (训练代码正文) ...\njoblib.dump(model, './models/experiment_001/model.pkl')",
  "infra_code": "from fastapi import FastAPI\nimport joblib\n# ... (部署代码正文) ...",
  "message": "Successfully trained model and generated deployment code."
}
```

### 3.2 Agent Debug 失败响应示例 (HTTP Status 200)

*注：业务逻辑上的失败（如 3 次 Debug 后代码仍无法运行），HTTP 状态码仍为 200，但业务状态 `deploy_status` 为 `"Failed"`。*

```json
{
  "deploy_status": "Failed",
  "model_folder": "./models/experiment_001",
  "train_code": "import missing_module\n# ... (最后一次尝试失败的代码) ...",
  "infra_code": "",
  "message": "Train code execution failed after 3 debug attempts."
}
```

---

## 4. 错误码说明 (HTTP Status Codes)

| 状态码 | 含义 | 触发场景 |
| :--- | :--- | :--- |
| `200` | OK | 请求成功，Agent 处理完毕（具体是否成功生成需看 `deploy_status`）。 |
| `422` | Unprocessable Entity | 请求参数校验失败（如遗漏了必填参数，或参数类型错误）。 |
| `500` | Internal Server Error | 服务器内部异常，如大模型 API 调用崩溃、环境缺失等。 |

**500 异常返回示例**：

```json
{
  "detail": "Internal Server Error: [LLM API timeout or related error message]"
}
```

---

## 💡 开发者提示 (Tips)

1. **接口耗时较长**：由于该接口涉及与大模型（LLM）的多轮对话，以及后台沙箱环境 (`execute_code_with_uv`) 的真实代码执行，接口响应时间可能在 **30秒 到 3分钟** 不等。调用方请务必**合理设置 HTTP 请求的超时时间 (Timeout)**，避免过早断开连接。
2. **可视化测试**：服务启动后，可以直接访问 `http://<host>:<port>/docs` 使用 FastAPI 自动生成的 Swagger UI 进行接口的可视化测试。