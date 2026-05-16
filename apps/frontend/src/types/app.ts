export type RunStatus = "queued" | "running" | "completed" | "failed";

export type StepStatus = "pending" | "running" | "success" | "failed";

export type StageId = 0 | 1 | 2;
export type ProjectStatus = "completed" | "running" | "created";
export type ProjectEntryView = "completed" | "running" | "created";

export type ExperimentComponentType =
  | "DataProfile"
  | "FeatureEng"
  | "Model"
  | "Workflow"
  | "Ensemble";

export type OptimizationMetricName = "AUC" | "KS" | "F1 Score" | "Accuracy" | "Recall";

export interface ProjectChat {
  id: number;
  projectId: string;
  name: string;
  time: string;
  status: ProjectStatus;
  summary?: string;
}

export interface StageDefinition {
  id: StageId;
  name: string;
  desc: string;
  icon: IconName;
}

export interface ExperimentComponent {
  id: string;
  order: string;
  type: ExperimentComponentType;
  status: "success" | "failed";
  hypothesis: string;
  evidence: string;
  metric: string;
}

export interface ExperimentLoop {
  id: number;
  name: string;
  status: "success" | "failed";
  summary: string;
  auc: number;
  ks: number;
  components: ExperimentComponent[];
}

export interface DeliveryOption {
  title: string;
  desc: string;
  icon: IconName;
}

export interface DeliveryMetric {
  label: string;
  value: string;
  accent?: "neutral" | "success" | "warning";
}

export interface WorkspaceMetrics {
  columnsDetected: number;
  rowsScanned: number;
  latestRuntime: string;
}

export interface OverviewMetricItem {
  label: string;
  value: string;
  meta?: string;
}

export interface ModelArtifactPackage {
  packageName: string;
  downloadUrl: string;
  sizeLabel?: string;
}

export interface DeployableModel {
  modelId: string;
  modelName: string;
  version: string;
  status: "recommended" | "available";
  primaryMetricName: OptimizationMetricName | string;
  primaryMetricValue: number;
  ks: number;
  f1Score?: number;
  accuracy?: number;
  recall?: number;
  featureCount?: number;
  trainedAt?: string;
  summary: string;
  deploymentSummary?: string;
  package: ModelArtifactPackage;
}

export interface ValidationRules {
  experimentRounds: {
    min: number;
    max: number;
    resetTo: number;
    errorMessage: string;
  };
  validationRatio: {
    min: number;
    max: number;
    resetTo: number;
    errorMessage: string;
  };
  optimizationTarget: {
    min: number;
    max: number;
    resetTo: number;
    errorMessage: string;
  };
}

export interface ProjectDatasetSummary {
  name: string;
  rows: number;
  columns: number;
  target: string;
}

export interface TrainingEvolutionStep {
  step_id: number;
  action: string;
  code: string;
  execution_status: "Success" | "Failed";
  execution_log: string;
  agent_reflection?: string;
}

export interface TrainingLoopLog {
  loop_id: number;
  scenario: string;
  task: string;
  status: "Success" | "Failed";
  timestamp: string;
  meta_controller: {
    exploration_type: string;
    exploration_reason: string;
  };
  research: {
    hypothesis_id: string;
    hypothesis: string;
    rationale: string;
    proposed_actions: string[];
  };
  development: {
    total_evolutions: number;
    evolving_steps: TrainingEvolutionStep[];
  };
  evaluation: {
    performance: {
      metrics: Record<string, number>;
      baseline_comparison?: Record<string, string>;
    };
    feedback_analysis: string;
  };
}

export interface RunningPlaybackLoopItem {
  id: number;
  name: string;
  status: "pending" | "running" | "success" | "failed";
  score?: number;
  note?: string;
}

export interface RunningPlaybackMetricItem extends OverviewMetricItem {
  revealed: boolean;
}

export interface RunningPlaybackStep extends TrainingEvolutionStep {
  visibleCode: string;
  visibleExecutionLog: string;
  revealed: boolean;
}

export interface RunningPlaybackLog extends TrainingLoopLog {
  revealedActions: string[];
  visibleFeedback: string;
  steps: RunningPlaybackStep[];
}

export interface RunningProjectData {
  currentStep: StageId;
  overviewMetrics: OverviewMetricItem[];
  loops: ExperimentLoop[];
  activeLoopId: number;
  loopLogs: TrainingLoopLog[];
}

export interface CompletedReviewIntakeSnapshot {
  modelingRequirement: string;
  experimentRounds: number;
  optimizationMetric: OptimizationMetricName;
  optimizationTarget: number;
  validationRatio: number;
  uploadedFile: string;
}

export interface CompletedReviewExperimentSnapshot {
  loops: ExperimentLoop[];
  activeLoopId: number;
  loopLogs: TrainingLoopLog[];
}

export interface CompletedProjectData {
  currentStep: StageId;
  models: DeployableModel[];
  defaultSelectedModelId: string;
  intakeSnapshot?: CompletedReviewIntakeSnapshot;
  experimentSnapshot?: CompletedReviewExperimentSnapshot;
}

export interface CreatedProjectData {
  currentStep: StageId;
  formDefaults: {
    modelingRequirement: string;
    experimentRounds: number;
    experimentRoundsInput: string;
    optimizationMetric: OptimizationMetricName;
    optimizationTarget: number;
    optimizationTargetInput: string;
    validationRatio: number;
    validationRatioInput: string;
  };
  requirementTemplates: string[];
  validationRules: ValidationRules;
  uploadHints: {
    title: string;
    subtitle: string;
  };
}

export interface FrontendProject {
  projectId: string;
  name: string;
  status: ProjectStatus;
  entryView: ProjectEntryView;
  time: string;
  summary: string;
  dataset: ProjectDatasetSummary;
  running?: RunningProjectData;
  completed?: CompletedProjectData;
  created?: CreatedProjectData;
}

export interface FrontendAppState {
  projectId: string;
  projectStatus: ProjectStatus;
  currentStep: StageId;
  uploadedFile: string | null;
  modelingRequirement: string;
  requirementSubmitted: boolean;
  experimentRounds: number;
  experimentRoundsInput: string;
  optimizationMetric: OptimizationMetricName;
  optimizationTarget: number;
  optimizationTargetInput: string;
  validationRatio: number;
  validationRatioInput: string;
  experimentView: "process" | "result";
  successfulOnly: boolean;
  activeLoopId: number;
  expandedExperimentId: string | null;
  experimentLoops: ExperimentLoop[];
  isProcessing: boolean;
  selectedChat: string;
  selectedModelId: string | null;
}

export type IconName =
  | "upload"
  | "brain"
  | "zap"
  | "fileText"
  | "rocket"
  | "chevronRight"
  | "check"
  | "alertCircle"
  | "trendingUp"
  | "barChart3"
  | "sparkles"
  | "settings"
  | "database"
  | "plus"
  | "menu"
  | "x"
  | "messageSquare"
  | "clock"
  | "play"
  | "download"
  | "pencil";
