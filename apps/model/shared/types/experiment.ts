export type RunStatus = "queued" | "running" | "completed" | "failed";

export type StepStatus = "pending" | "running" | "success" | "failed";

export interface ExperimentStep {
  stepId: string;
  name: string;
  type: string;
  status: StepStatus;
  summary?: string;
}

export interface ExperimentRun {
  runId: string;
  projectId: string;
  status: RunStatus;
  dataset: {
    name: string;
    rows?: number;
    columns?: number;
  };
  prompt: {
    goal: string;
    systemPrompt?: string;
    userPrompt?: string;
  };
  config?: {
    maxLoops?: number;
    evaluationMetric?: string;
    baselineModels?: string[];
  };
  steps: ExperimentStep[];
  result: {
    bestLoop?: string;
    bestMetric?: {
      name?: string;
      value?: number;
    };
    artifacts?: Array<{
      name?: string;
      type?: string;
    }>;
    summary: string;
  };
}
