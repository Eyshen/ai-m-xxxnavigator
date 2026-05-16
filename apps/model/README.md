# ai-m-xxxnavigator

一款面向业务分析师、数据分析师、风控建模人员和低代码建模用户的智能建模辅助工具。

这个仓库现在按黑客松项目的推进方式，拆成了两条主线：

1. `apps/frontend`：前端交互与可视化项目
2. `apps/model`：模型实验与产出项目

中间再增加一层 `shared`，专门放前端和模型都要遵守的数据结构、类型和常量，避免两边各写各的。

## 推荐目录结构

```text
.
├── apps
│   ├── frontend
│   │   ├── public                  # 静态资源
│   │   ├── mock                    # 前端联调用模拟数据
│   │   └── src
│   │       ├── assets              # 图片、图标、演示素材
│   │       ├── components
│   │       │   ├── layout          # 页面布局、导航、容器
│   │       │   ├── forms           # 数据集/提示词/配置输入表单
│   │       │   ├── process         # 实验过程展示组件
│   │       │   ├── result          # 结果展示组件
│   │       │   └── charts          # 指标图表、趋势图、对比图
│   │       ├── pages               # 页面级模块
│   │       ├── hooks               # 复用逻辑
│   │       ├── services            # API 请求与数据适配
│   │       ├── store               # 全局状态
│   │       ├── styles              # 全局样式和主题
│   │       ├── types               # 前端本地类型
│   │       └── utils               # 工具方法
│   └── model
│       ├── configs                 # 模型运行配置
│       ├── prompts                 # 提示词模板
│       ├── datasets
│       │   ├── raw                 # 原始数据集
│       │   ├── processed           # 清洗/特征工程后的数据
│       │   └── samples             # 样例数据，方便演示
│       ├── pipelines               # 数据处理和训练流水线
│       ├── workflows               # 端到端工作流编排
│       ├── agents                  # Agent 或多轮实验逻辑
│       ├── experiments
│       │   ├── runs                # 每次实验运行记录
│       │   ├── logs                # 过程日志
│       │   ├── artifacts           # 模型文件、图表、导出物
│       │   └── reports             # 实验报告与总结
│       ├── evaluations             # 指标评估、对比逻辑
│       ├── notebooks               # 探索分析
│       ├── scripts                 # 启动、预处理、批处理脚本
│       └── tests                   # 模型侧测试
├── shared
│   ├── schemas                     # JSON Schema / 数据契约
│   ├── types                       # 共享类型定义
│   ├── constants                   # 共享常量
│   └── utils                       # 共享工具函数
├── docs
│   ├── architecture                # 架构设计
│   ├── product                     # 产品说明、页面规划
│   ├── api                         # 接口设计
│   └── workflows                   # 业务流程和实验流程
├── ops
│   ├── scripts                     # 工程化脚本
│   └── deploy                      # 部署配置
└── model-navigator-v2.html         # 当前前端原型，暂时保留在根目录
```

## 两块核心项目怎么分工

### 1. 前端项目 `apps/frontend`

前端主要负责 4 件事：

- 输入：上传数据集、填写业务目标、补充提示词、选择运行配置
- 过程：展示模型运行过程、步骤状态、日志、实验轮次和中间指标
- 结果：展示最优方案、指标对比、特征说明、导出物
- 交互：让用户可以继续追加实验、切换结果、下载报告或触发部署

建议页面可以按下面拆：

- `Dashboard / Workspace`：项目总览
- `Data Intake`：数据上传和字段预览
- `Prompt & Config`：提示词和参数输入
- `Experiment Process`：多轮实验过程面板
- `Experiment Result`：最佳结果和对比结果
- `Delivery`：模型导出、报告导出、部署入口

### 2. 模型项目 `apps/model`

模型侧主要负责 5 件事：

- 接收前端提交的输入：数据集、提示词、配置
- 做预处理、特征工程、训练、评估、多轮实验
- 记录过程数据：每一步做了什么、耗时、是否成功、关键日志
- 产出结果数据：最优模型、指标、解释、图表、报告
- 把标准化结果返回给前端展示

模型侧建议遵守一个固定输出结构：

- `experiments/runs/`：记录每次 run 的元信息
- `experiments/logs/`：记录过程日志和中间状态
- `experiments/artifacts/`：保存模型文件、图表、导出内容
- `experiments/reports/`：沉淀最终报告

### 3. 共享层 `shared`

这一层很关键，黑客松里最容易出问题的就是前端和模型字段对不上。这里建议只做“契约”，不要写业务逻辑：

- `schemas/`：定义接口返回结构
- `types/`：定义共享类型
- `constants/`：定义状态枚举、步骤枚举、图表类型

## 推荐数据流

1. 前端在 `apps/frontend` 收集数据集、提示词、配置。
2. 前端把请求按 `shared/schemas` 的结构发送给模型侧。
3. 模型在 `apps/model/workflows` 发起一次完整实验。
4. 模型把过程数据写到 `experiments/logs` / `experiments/runs`。
5. 模型把结果数据写到 `experiments/artifacts` / `experiments/reports`。
6. 前端根据共享契约读取并展示过程与结果。

## 当前仓库说明

- 根目录的 `model-navigator-v2.html` 是现有前端原型，先保留不动。
- 新开发建议从 `apps/frontend` 和 `apps/model` 开始。
- 如果后面前端项目正式起应用框架，可以把这个 HTML 原型迁移到 `apps/frontend/public/prototypes/` 作为演示稿。

## 建议你们下一步马上做的事

1. 先在 `shared/schemas` 定义一次实验输入和输出的数据结构。
2. 前端先用 `apps/frontend/mock` 的模拟数据把页面跑通。
3. 模型侧先打通最小闭环：读取样例数据 -> 跑一轮实验 -> 输出结果 JSON。
4. 前后端最后只通过共享契约联调，避免临时改字段。
