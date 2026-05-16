import type {
  CompletedProjectData,
  CompletedReviewExperimentSnapshot,
  CompletedReviewIntakeSnapshot,
  CreatedProjectData,
  DeliveryOption,
  ExperimentLoop,
  FrontendAppState,
  FrontendProject,
  OptimizationMetricName,
  OverviewMetricItem,
  ProjectChat,
  ProjectStatus,
  RunningProjectData,
  StageDefinition,
  TrainingLoopLog,
  WorkspaceMetrics
} from "@/types/app";

import projectListSource from "../../../../docs/frontend/data/project-list.json";
import workflowStagesSource from "../../../../docs/frontend/data/workflow-stages.json";
import sharedUiSource from "../../../../docs/frontend/data/shared-ui.json";
import creditRiskProjectSource from "../../../../docs/frontend/data/projects/credit-risk-model.json";
import customerChurnProjectSource from "../../../../docs/frontend/data/projects/customer-churn-model.json";
import marketingResponseProjectSource from "../../../../docs/frontend/data/projects/marketing-response-model.json";
import fraudTransferRunningProjectSource from "../../../../docs/frontend/data/projects/fraud-transfer-running.json";
import newModelingProjectSource from "../../../../docs/frontend/data/projects/new-modeling-project.json";
import fraudTransferRunningLoopsSource from "../../../../docs/frontend/data/runs/fraud-transfer-running-loops.json";
import fraudTransferRunningLogSource from "../../../../docs/frontend/data/runs/fraud-transfer-running-log.json";
import displayDataSource from "../../../../docs/frontend/display-data.json";
import type { ExperimentRun } from "@shared/types/experiment";

const stageDefaults = workflowStagesSource as StageDefinition[];

export const workflowStages = stageDefaults;

export const productHighlights = sharedUiSource.productHighlights;
export const quickRequirementTemplates = sharedUiSource.quickRequirementTemplates;

export const deliveryChecklist = sharedUiSource.deliveryChecklist;

export const workspaceMetrics = sharedUiSource.workspaceMetrics as WorkspaceMetrics;

export const deliveryOptions = sharedUiSource.deliveryOptions as DeliveryOption[];

export const defaultExperimentLoops = displayDataSource.defaultExperimentLoops as ExperimentLoop[];

export const demoExperimentRun = displayDataSource.experimentRun as ExperimentRun;

function cloneLoops(loops: ExperimentLoop[]) {
  return loops.map((loop) => ({
    ...loop,
    components: loop.components.map((component) => ({ ...component }))
  }));
}

function toRunningExperimentLoops(baseLoops: ExperimentLoop[], logs: any[]): ExperimentLoop[] {
  const baseMap = new Map(baseLoops.map((loop) => [loop.id, loop]));

  return logs.map((log) => {
    const base = baseMap.get(log.loop_id);
    const auc = Number(log?.evaluation?.performance?.metrics?.AUC ?? base?.auc ?? 0);
    const ks = Number(log?.evaluation?.performance?.metrics?.KS ?? base?.ks ?? 0);
    const summary = base?.summary ?? log?.evaluation?.feedback_analysis?.split("\n")[0] ?? `${log.loop_id} Loop 实验完成`;

    const components = base?.components ?? [
      {
        id: `${log.loop_id}-meta`,
        order: String(log.loop_id * 2 - 1).padStart(2, "0"),
        type: log.meta_controller?.exploration_type === "Model" ? "Model" : "FeatureEng",
        status: log.status === "Success" ? "success" : "failed",
        hypothesis: log.research?.hypothesis_name ?? log.research?.motivation ?? "待补充假设",
        evidence: log.research?.analysis_of_history ?? "待补充分析",
        metric: typeof auc === "number" ? `${auc.toFixed(3)} AUC` : "--"
      },
      {
        id: `${log.loop_id}-eval`,
        order: String(log.loop_id * 2).padStart(2, "0"),
        type: "Workflow",
        status: log.status === "Success" ? "success" : "failed",
        hypothesis: log.research?.validation_strategy ?? "待补充验证策略",
        evidence: log.evaluation?.feedback_analysis ?? "待补充反馈分析",
        metric: typeof ks === "number" ? `${ks.toFixed(3)} KS` : "--"
      }
    ];

    return {
      id: log.loop_id,
      name: `${String(log.loop_id).padStart(2, "0")} Loop`,
      status: log.status === "Success" ? "success" : "failed",
      summary,
      auc,
      ks,
      components
    };
  });
}

function normalizeLoopLogRecord(record: any) {
  const research = record?.research ?? {};
  const development = record?.development ?? {};
  const evaluation = record?.evaluation ?? {};
  const performance = evaluation?.performance ?? {};
  const metrics = performance?.metrics ?? {};

  const proposedActions = Array.isArray(research.proposed_actions)
    ? research.proposed_actions
    : [
        research.validation_strategy,
        research.methodology,
        research.expected_outcome
      ].filter(Boolean);

  return {
    ...record,
    research: {
      hypothesis_id: research.hypothesis_id ?? research.hypothesis_name ?? `HYP-${record?.loop_id ?? "000"}`,
      hypothesis: research.hypothesis ?? research.motivation ?? "",
      rationale: research.rationale ?? research.analysis_of_history ?? "",
      proposed_actions: proposedActions
    },
    development: {
      total_evolutions: development.total_evolutions ?? 0,
      evolving_steps: Array.isArray(development.evolving_steps) ? development.evolving_steps : []
    },
    evaluation: {
      performance: {
        metrics,
        baseline_comparison: performance.baseline_comparison ?? {}
      },
      feedback_analysis: evaluation.feedback_analysis ?? ""
    }
  };
}

function mapProjectChat(status: ProjectStatus) {
  return status;
}

function withDatasetFallback<T extends { dataset: FrontendProject["dataset"] }>(project: T) {
  return {
    ...project,
    dataset: {
      ...project.dataset
    }
  };
}

function cloneTrainingLoopLogs(logs: TrainingLoopLog[]) {
  return logs.map((log) => ({
    ...log,
    meta_controller: { ...log.meta_controller },
    research: {
      ...log.research,
      proposed_actions: [...log.research.proposed_actions]
    },
    development: {
      ...log.development,
      evolving_steps: log.development.evolving_steps.map((step) => ({ ...step }))
    },
    evaluation: {
      ...log.evaluation,
      performance: {
        ...log.evaluation.performance,
        metrics: { ...log.evaluation.performance.metrics },
        baseline_comparison: {
          ...(log.evaluation.performance.baseline_comparison ?? {})
        }
      }
    }
  }));
}

function getBestLoopId(loops: ExperimentLoop[]) {
  if (loops.length === 0) {
    return 0;
  }

  return loops.reduce((winner, loop) => (loop.auc > winner.auc ? loop : winner), loops[0]).id;
}

const completedRequirementMap: Record<string, string> = {
  "credit-risk-model":
    "请基于客户交易、收入、存款和信用额度数据，建立信用卡逾期风险预测模型，重点识别未来30天可能逾期的高风险客户，并输出可解释的关键影响因素。",
  "customer-churn-model":
    "请基于客户画像、服务记录、交易频次和套餐使用行为，建立客户流失预测模型，重点识别未来30天存在流失风险的客户，并给出可解释的关键驱动因素。",
  "marketing-response-model":
    "请基于用户画像、活动触达、历史转化和渠道交互数据，建立营销响应率预测模型，重点识别高响应客群并输出便于复盘的关键特征说明。",
  "fraud-transfer-running":
    "请基于转账行为、设备指纹、账户关系和时序特征，建立欺诈交易识别模型，重点识别高风险转账并输出适合风控评审的关键影响因素。"
};

function buildCompletedIntakeSnapshot(
  project: FrontendProject,
  experimentRounds: number,
  optimizationMetric: OptimizationMetricName = "AUC"
): CompletedReviewIntakeSnapshot {
  return {
    modelingRequirement:
      completedRequirementMap[project.projectId] ?? demoExperimentRun.prompt.goal,
    experimentRounds,
    optimizationMetric,
    optimizationTarget: 0.95,
    validationRatio: 20,
    uploadedFile: project.dataset.name
  };
}

function buildCompletedExperimentSnapshot(
  loops: ExperimentLoop[],
  loopLogs: TrainingLoopLog[] = []
): CompletedReviewExperimentSnapshot {
  return {
    loops: cloneLoops(loops),
    activeLoopId: getBestLoopId(loops),
    loopLogs: cloneTrainingLoopLogs(loopLogs)
  };
}

function withCompletedReview(project: FrontendProject, experimentSnapshot: CompletedReviewExperimentSnapshot) {
  const completed = project.completed as CompletedProjectData;

  return {
    ...project,
    completed: {
      ...completed,
      intakeSnapshot: buildCompletedIntakeSnapshot(project, experimentSnapshot.loops.length),
      experimentSnapshot
    }
  } satisfies FrontendProject;
}

const fraudReviewLoops = toRunningExperimentLoops(
  cloneLoops(fraudTransferRunningLoopsSource as ExperimentLoop[]),
  fraudTransferRunningLogSource as any[]
);
const fraudReviewLogs = (fraudTransferRunningLogSource as any[]).map(normalizeLoopLogRecord) as TrainingLoopLog[];
const fraudRunningTemplate: RunningProjectData = {
  currentStep: 1,
  overviewMetrics: [
    { label: "识别字段", value: "61", meta: "自动字段识别" },
    { label: "扫描样本", value: "300,000", meta: "交易样本规模" },
    { label: "成功 LOOP", value: "2", meta: "收益成立方案" },
    { label: "最佳 AUC", value: "0.912", meta: "当前最优模型" },
    { label: "结果项", value: "6", meta: "可追溯实验记录" }
  ],
  loops: cloneLoops(fraudReviewLoops),
  activeLoopId: 2,
  loopLogs: cloneTrainingLoopLogs(fraudReviewLogs)
};

const completedCredit = withCompletedReview(
  withDatasetFallback(creditRiskProjectSource) as FrontendProject,
  buildCompletedExperimentSnapshot(defaultExperimentLoops)
);
const completedChurn = withCompletedReview(
  withDatasetFallback(customerChurnProjectSource) as FrontendProject,
  buildCompletedExperimentSnapshot(defaultExperimentLoops)
);
const completedMarketing = withCompletedReview(
  withDatasetFallback(marketingResponseProjectSource) as FrontendProject,
  buildCompletedExperimentSnapshot(defaultExperimentLoops)
);

const completedFraud = {
  ...withCompletedReview(
    withDatasetFallback(fraudTransferRunningProjectSource) as FrontendProject,
    buildCompletedExperimentSnapshot(fraudReviewLoops, fraudReviewLogs)
  ),
  running: fraudRunningTemplate
} satisfies FrontendProject;

const createdProject = newModelingProjectSource as FrontendProject;

export const frontendProjects: FrontendProject[] = [
  completedCredit,
  completedChurn,
  completedMarketing,
  completedFraud,
  createdProject
];

export const projectHistory: ProjectChat[] = (projectListSource as ProjectChat[]).map((item) => ({
  ...item,
  status: mapProjectChat(item.status)
}));

export function getInitialEditableProjects(): FrontendProject[] {
  return frontendProjects.map((project) => ({
    ...project,
    dataset: { ...project.dataset },
    running: project.running
      ? {
          ...project.running,
          overviewMetrics: project.running.overviewMetrics.map((metric) => ({ ...metric })),
          loops: cloneLoops(project.running.loops),
          loopLogs: cloneTrainingLoopLogs(project.running.loopLogs)
        }
      : undefined,
    completed: project.completed
      ? {
          ...project.completed,
          models: project.completed.models.map((model) => ({
            ...model,
            package: { ...model.package }
          })),
          intakeSnapshot: project.completed.intakeSnapshot
            ? { ...project.completed.intakeSnapshot }
            : undefined,
          experimentSnapshot: project.completed.experimentSnapshot
            ? {
                ...project.completed.experimentSnapshot,
                loops: cloneLoops(project.completed.experimentSnapshot.loops),
                loopLogs: cloneTrainingLoopLogs(project.completed.experimentSnapshot.loopLogs)
              }
            : undefined
        }
      : undefined,
    created: project.created
      ? {
          ...project.created,
          formDefaults: { ...project.created.formDefaults },
          requirementTemplates: [...project.created.requirementTemplates],
          validationRules: {
            experimentRounds: { ...project.created.validationRules.experimentRounds },
            validationRatio: { ...project.created.validationRules.validationRatio },
            optimizationTarget: { ...project.created.validationRules.optimizationTarget }
          },
          uploadHints: { ...project.created.uploadHints }
        }
      : undefined
  }));
}

export function getProjectById(projectId: string) {
  return frontendProjects.find((project) => project.projectId === projectId) ?? frontendProjects[0];
}

function getStateFromCreatedProject(project: FrontendProject): FrontendAppState {
  const created = project.created as CreatedProjectData;
  return {
    projectId: project.projectId,
    projectStatus: project.status,
    currentStep: created.currentStep,
    uploadedFile: null,
    modelingRequirement: created.formDefaults.modelingRequirement,
    requirementSubmitted: false,
    experimentRounds: created.formDefaults.experimentRounds,
    experimentRoundsInput: created.formDefaults.experimentRoundsInput,
    optimizationMetric: created.formDefaults.optimizationMetric,
    optimizationTarget: created.formDefaults.optimizationTarget,
    optimizationTargetInput: created.formDefaults.optimizationTargetInput,
    validationRatio: created.formDefaults.validationRatio,
    validationRatioInput: created.formDefaults.validationRatioInput,
    experimentView: "result",
    successfulOnly: false,
    activeLoopId: 0,
    expandedExperimentId: null,
    experimentLoops: cloneLoops(defaultExperimentLoops),
    isProcessing: false,
    selectedChat: project.name,
    selectedModelId: null
  };
}

function getStateFromRunningProject(project: FrontendProject): FrontendAppState {
  const running = project.running as RunningProjectData;
  return {
    projectId: project.projectId,
    projectStatus: project.status,
    currentStep: running.currentStep,
    uploadedFile: project.dataset.name,
    modelingRequirement: demoExperimentRun.prompt.goal,
    requirementSubmitted: true,
    experimentRounds: running.loops.length,
    experimentRoundsInput: String(running.loops.length),
    optimizationMetric: "AUC",
    optimizationTarget: 0.95,
    optimizationTargetInput: "0.95",
    validationRatio: 20,
    validationRatioInput: "20",
    experimentView: "process",
    successfulOnly: false,
    activeLoopId: running.activeLoopId,
    expandedExperimentId: null,
    experimentLoops: cloneLoops(running.loops),
    isProcessing: false,
    selectedChat: project.name,
    selectedModelId: null
  };
}

function getStateFromCompletedProject(project: FrontendProject): FrontendAppState {
  const completed = project.completed as CompletedProjectData;
  const intakeSnapshot = completed.intakeSnapshot;
  const experimentSnapshot = completed.experimentSnapshot;
  const experimentLoops = experimentSnapshot?.loops ?? defaultExperimentLoops;
  return {
    projectId: project.projectId,
    projectStatus: project.status,
    currentStep: completed.currentStep,
    uploadedFile: intakeSnapshot?.uploadedFile ?? project.dataset.name,
    modelingRequirement: intakeSnapshot?.modelingRequirement ?? demoExperimentRun.prompt.goal,
    requirementSubmitted: true,
    experimentRounds: intakeSnapshot?.experimentRounds ?? experimentLoops.length,
    experimentRoundsInput: String(intakeSnapshot?.experimentRounds ?? experimentLoops.length),
    optimizationMetric: intakeSnapshot?.optimizationMetric ?? "AUC",
    optimizationTarget: intakeSnapshot?.optimizationTarget ?? 0.95,
    optimizationTargetInput: String(intakeSnapshot?.optimizationTarget ?? 0.95),
    validationRatio: intakeSnapshot?.validationRatio ?? 20,
    validationRatioInput: String(intakeSnapshot?.validationRatio ?? 20),
    experimentView: "result",
    successfulOnly: false,
    activeLoopId: experimentSnapshot?.activeLoopId ?? getBestLoopId(experimentLoops),
    expandedExperimentId: null,
    experimentLoops: cloneLoops(experimentLoops),
    isProcessing: false,
    selectedChat: project.name,
    selectedModelId: completed.defaultSelectedModelId
  };
}

export function createAppStateFromProject(project: FrontendProject): FrontendAppState {
  if (project.status === "created") {
    return getStateFromCreatedProject(project);
  }

  if (project.status === "running") {
    return getStateFromRunningProject(project);
  }

  return getStateFromCompletedProject(project);
}

export const initialProject = getProjectById("new-modeling-project");

export const initialAppState: FrontendAppState = createAppStateFromProject(initialProject);

export function cloneExperimentLoops(loops: ExperimentLoop[]): ExperimentLoop[] {
  return cloneLoops(loops);
}

export function createGeneratedLoop(id: number): ExperimentLoop {
  const padded = String(id).padStart(2, "0");
  const isSuccess = id % 3 !== 0;
  const auc = isSuccess ? 0.912 + (id - 3) * 0.0018 : 0.884 - id * 0.0005;

  return {
    id,
    name: `${padded} Loop`,
    status: isSuccess ? "success" : "failed",
    summary: isSuccess
      ? "新增实验验证了特征交叉或模型切换策略，模型效果继续提升。"
      : "新增实验收益不足，已记录为排除方案。",
    auc,
    ks: isSuccess ? 0.691 + (id - 3) * 0.003 : 0.655,
    components: [
      {
        id: `${id}-feature`,
        order: String(id * 2).padStart(2, "0"),
        type: "FeatureEng",
        status: isSuccess ? "success" : "failed",
        hypothesis: isSuccess
          ? "继续保留高收益欺诈交叉特征并压缩低贡献字段。"
          : "尝试更激进的交叉组合以捕捉极端欺诈模式。",
        evidence: isSuccess
          ? "验证集指标继续提升，误报率控制更稳定。"
          : "训练收益存在，但验证集波动较大。",
        metric: isSuccess ? "+0.18 AUC" : "-0.31 AUC"
      },
      {
        id: `${id}-model`,
        order: String(id * 2 + 1).padStart(2, "0"),
        type: isSuccess ? "Model" : "Workflow",
        status: "success",
        hypothesis: isSuccess
          ? "验证当前特征下的模型泛化能力与部署可行性。"
          : "沉淀当前失败方案以避免重复探索。",
        evidence: isSuccess
          ? "当前方案已具备进入交付候选的能力。"
          : "失败方案已归档，准备切换下一轮方向。",
        metric: isSuccess ? "推荐候选" : "已归档"
      }
    ]
  };
}

export function getRunningOverviewMetrics(project: FrontendProject): OverviewMetricItem[] {
  return (project.running?.overviewMetrics ?? []) as OverviewMetricItem[];
}

export function getCompletedProjectData(project: FrontendProject): CompletedProjectData | null {
  return (project.completed ?? null) as CompletedProjectData | null;
}

export function getRunningProjectData(project: FrontendProject): RunningProjectData | null {
  return (project.running ?? null) as RunningProjectData | null;
}

export function getCreatedProjectData(project: FrontendProject): CreatedProjectData | null {
  return (project.created ?? null) as CreatedProjectData | null;
}

export function getDefaultCompletedTemplate(): CompletedProjectData {
  return completedCredit.completed as CompletedProjectData;
}
