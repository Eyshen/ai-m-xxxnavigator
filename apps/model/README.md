# Model

模型项目负责接收输入、执行实验、记录过程、产出结果。

## 目录职责

- `configs/`：实验配置，例如目标变量、轮次数、评估指标
- `prompts/`：系统提示词、任务提示词、分析提示词模板
- `datasets/raw/`：原始数据集
- `datasets/processed/`：清洗和特征工程后的数据
- `datasets/samples/`：演示样本
- `pipelines/`：数据处理、训练、评估流水线
- `workflows/`：端到端实验编排
- `agents/`：多轮实验、假设生成、策略选择逻辑
- `experiments/runs/`：每次 run 的元数据
- `experiments/logs/`：过程日志和步骤状态
- `experiments/artifacts/`：模型文件、图表、导出结果
- `experiments/reports/`：面向用户或评委的总结报告

## 最小可用闭环

1. 从 `datasets/samples/` 读取一个样例数据集
2. 从 `configs/` 读取一次实验配置
3. 从 `prompts/` 读取任务提示词
4. 在 `workflows/` 里执行一次完整流程
5. 把运行过程写入 `experiments/runs/` 和 `experiments/logs/`
6. 把最终结果写入 `experiments/artifacts/` 和 `experiments/reports/`

## 输出建议

模型最终至少输出两类内容：

- 面向前端展示的结构化 JSON
- 面向演示讲解的报告和图表
