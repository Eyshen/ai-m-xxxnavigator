import type {
  CompletedProjectData,
  CreatedProjectData,
  DeliveryOption,
  ExperimentLoop,
  FrontendAppState,
  FrontendProject,
  OverviewMetricItem,
  ProjectChat,
  ProjectStatus,
  RunningProjectData,
  StageDefinition,
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

const completedCredit = withDatasetFallback(creditRiskProjectSource) as FrontendProject;
const completedChurn = withDatasetFallback(customerChurnProjectSource) as FrontendProject;
const completedMarketing = withDatasetFallback(marketingResponseProjectSource) as FrontendProject;

const runningFraud = {
  ...(fraudTransferRunningProjectSource as FrontendProject),
  running: {
    ...(fraudTransferRunningProjectSource.running as RunningProjectData),
    loops: cloneLoops(fraudTransferRunningLoopsSource as ExperimentLoop[]),
    activeLoopId: fraudTransferRunningProjectSource.running.activeLoopId,
    loopLogs: (fraudTransferRunningLogSource as any[]).map(normalizeLoopLogRecord)
  }
} satisfies FrontendProject;

const createdProject = newModelingProjectSource as FrontendProject;

export const frontendProjects: FrontendProject[] = [
  completedCredit,
  completedChurn,
  completedMarketing,
  runningFraud,
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
          loopLogs: project.running.loopLogs.map((log) => ({
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
          }))
        }
      : undefined,
    completed: project.completed
      ? {
          ...project.completed,
          models: project.completed.models.map((model) => ({
            ...model,
            package: { ...model.package }
          }))
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
  return {
    projectId: project.projectId,
    projectStatus: project.status,
    currentStep: completed.currentStep,
    uploadedFile: project.dataset.name,
    modelingRequirement: demoExperimentRun.prompt.goal,
    requirementSubmitted: true,
    experimentRounds: 5,
    experimentRoundsInput: "5",
    optimizationMetric: "AUC",
    optimizationTarget: 0.95,
    optimizationTargetInput: "0.95",
    validationRatio: 20,
    validationRatioInput: "20",
    experimentView: "result",
    successfulOnly: false,
    activeLoopId: 0,
    expandedExperimentId: null,
    experimentLoops: cloneLoops(defaultExperimentLoops),
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
