import { DataIntakePanel } from "@/components/forms/DataIntakePanel";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ExperimentWorkspace } from "@/components/process/ExperimentWorkspace";
import { StageProgress } from "@/components/process/StageProgress";
import { CompletedProjectResult } from "@/components/result/CompletedProjectResult";
import { DeliveryPanel } from "@/components/result/DeliveryPanel";
import {
  cloneExperimentLoops,
  createAppStateFromProject,
  deliveryChecklist,
  demoExperimentRun,
  createGeneratedLoop,
  defaultExperimentLoops,
  deliveryOptions,
  getCompletedProjectData,
  getCreatedProjectData,
  getProjectById,
  getRunningOverviewMetrics,
  getRunningProjectData,
  initialAppState,
  initialProject,
  projectHistory,
  quickRequirementTemplates,
  workflowStages,
  workspaceMetrics
} from "@/data/mockData";
import { downloadJson } from "@/utils/download";
import type { FrontendAppState } from "@/types/app";
import { useEffect, useState } from "react";

const metricPlaceholders: Record<FrontendAppState["optimizationMetric"], string> = {
  AUC: "0.95",
  KS: "0.42",
  "F1 Score": "0.88",
  Accuracy: "0.90",
  Recall: "0.85"
};

function configuredExperimentLoops(state: FrontendAppState) {
  const count = Math.max(1, Math.min(8, Number(state.experimentRounds) || 5));
  const loops = cloneExperimentLoops(
    defaultExperimentLoops.slice(0, Math.min(count, defaultExperimentLoops.length))
  );

  while (loops.length < count) {
    loops.push(createGeneratedLoop(loops.length + 1));
  }

  return loops;
}

function getValidationErrors(state: FrontendAppState) {
  const errors: Partial<Record<"experimentRounds" | "validationRatio" | "optimizationTarget", string>> =
    {};

  const roundsRaw = state.experimentRoundsInput.trim();
  const roundsNum = Number(roundsRaw);
  if (!roundsRaw || !Number.isInteger(roundsNum) || roundsNum < 1 || roundsNum > 8) {
    errors.experimentRounds = "请输入 1 到 8 之间的整数轮次。";
  }

  const ratioRaw = state.validationRatioInput.trim();
  const ratioNum = Number(ratioRaw);
  if (!ratioRaw || !Number.isFinite(ratioNum) || ratioNum < 0 || ratioNum > 100) {
    errors.validationRatio = "输入数据超范围";
  }

  const targetRaw = state.optimizationTargetInput.trim();
  const targetNum = Number(targetRaw);
  if (!targetRaw || !Number.isFinite(targetNum) || targetNum < 0 || targetNum > 1) {
    errors.optimizationTarget = "输入数据超范围";
  }

  return errors;
}

function isConfigValid(state: FrontendAppState) {
  const errors = getValidationErrors(state);
  return !errors.experimentRounds && !errors.validationRatio && !errors.optimizationTarget;
}

function normalizeInputWithReset(
  rawValue: string,
  min: number,
  max: number,
  resetTo: number,
  integerOnly = false
) {
  const num = Number(rawValue);
  if (!rawValue.trim()) {
    return null;
  }

  if (!Number.isFinite(num)) {
    return resetTo;
  }

  if (integerOnly && !Number.isInteger(num)) {
    return resetTo;
  }

  if (num < min || num > max) {
    return resetTo;
  }

  return num;
}

export function WorkspacePage() {
  const [state, setState] = useState<FrontendAppState>(initialAppState);
  const project = getProjectById(state.projectId);
  const validationErrors = getValidationErrors(state);
  const configValid = isConfigValid(state);

  useEffect(() => {
    if (!state.isProcessing) {
      return;
    }

    const timer = window.setTimeout(() => {
      setState((current) => ({
        ...current,
        isProcessing: false
      }));
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [state.isProcessing]);

  const resetWorkspace = () => {
    setState(createAppStateFromProject(initialProject));
  };

  const datasetSummary = {
    fields: project.dataset.columns,
    rows: project.dataset.rows,
    target: project.dataset.target,
    source: state.uploadedFile ?? project.dataset.name
  };
  const bestLoop = state.experimentLoops.reduce(
    (winner, loop) => (loop.auc > winner.auc ? loop : winner),
    state.experimentLoops[0]
  );
  const runningData = getRunningProjectData(project);
  const createdData = getCreatedProjectData(project);
  const completedData = getCompletedProjectData(project);
  const selectedModel =
    completedData?.models.find((model) => model.modelId === state.selectedModelId) ??
    completedData?.models[0] ??
    null;

  const stageMetricName =
    project.status === "completed" && selectedModel
      ? selectedModel.primaryMetricName
      : state.optimizationMetric;
  const stageMetricValue =
    project.status === "completed" && selectedModel
      ? selectedModel.primaryMetricValue.toFixed(4)
      : state.currentStep === 0
        ? null
        : bestLoop.auc.toFixed(4);
  const stageKsValue =
    project.status === "completed" && selectedModel
      ? selectedModel.ks.toFixed(4)
      : state.currentStep === 0
        ? null
        : bestLoop.ks.toFixed(4);

  return (
    <div className="app-shell">
      <Sidebar
        chats={projectHistory}
        selectedChat={state.selectedChat}
        onSelectChat={(name) => {
          const chat = projectHistory.find((item) => item.name === name);
          if (!chat) return;
          const nextProject = getProjectById(chat.projectId);
          setState(createAppStateFromProject(nextProject));
        }}
        onNewChat={resetWorkspace}
      />

      <main className="app-main">
        <Topbar
          title={state.selectedChat}
          currentStep={state.currentStep}
          uploadedFile={state.uploadedFile}
          isProcessing={state.isProcessing}
        />

        <section className="workspace-content">
          <StageProgress
            stages={workflowStages}
            currentStep={state.currentStep}
            uploadedFile={state.uploadedFile}
            experimentRounds={state.experimentRounds}
            validationRatio={state.validationRatio}
            metricName={stageMetricName}
            bestMetric={stageMetricValue}
            bestKs={stageKsValue}
          />

          {project.status === "created" ? (
            <DataIntakePanel
              state={state}
              validationErrors={validationErrors}
              configValid={configValid}
              requirementTemplates={createdData?.requirementTemplates ?? quickRequirementTemplates}
              datasetSummary={datasetSummary}
              onRequirementChange={(value) =>
                setState((current) => ({
                  ...current,
                  modelingRequirement: value,
                  requirementSubmitted: false
                }))
              }
              onMetricChange={(value) =>
                setState((current) => ({
                  ...current,
                  optimizationMetric: value,
                  optimizationTargetInput:
                    current.optimizationTargetInput.trim().length > 0
                      ? current.optimizationTargetInput
                      : metricPlaceholders[value],
                  optimizationTarget:
                    current.optimizationTargetInput.trim().length > 0
                      ? current.optimizationTarget
                      : Number(metricPlaceholders[value])
                }))
              }
              onRoundsChange={(value) =>
                setState((current) => ({
                  ...current,
                  experimentRoundsInput: value,
                  experimentRounds:
                    normalizeInputWithReset(value, 1, 8, 1, true) ?? current.experimentRounds
                }))
              }
              onValidationRatioChange={(value) =>
                setState((current) => {
                  const normalized = normalizeInputWithReset(value, 0, 100, 0);
                  const shouldReset =
                    value.trim().length > 0 &&
                    normalized === 0 &&
                    (Number(value) < 0 || Number(value) > 100 || !Number.isFinite(Number(value)));

                  return {
                    ...current,
                    validationRatioInput: shouldReset ? "0" : value,
                    validationRatio:
                      normalized ?? current.validationRatio
                  };
                })
              }
              onOptimizationTargetChange={(value) =>
                setState((current) => {
                  const normalized = normalizeInputWithReset(value, 0, 1, 0);
                  const shouldReset =
                    value.trim().length > 0 &&
                    normalized === 0 &&
                    (Number(value) < 0 || Number(value) > 1 || !Number.isFinite(Number(value)));

                  return {
                    ...current,
                    optimizationTargetInput: shouldReset ? "0" : value,
                    optimizationTarget:
                      normalized ?? current.optimizationTarget
                  };
                })
              }
              onFileUpload={(fileName) =>
                setState((current) => ({
                  ...current,
                  uploadedFile: fileName,
                  isProcessing: true,
                  requirementSubmitted: false
                }))
              }
              onSubmitRequirement={() => {
                if (!state.uploadedFile || state.isProcessing || !configValid) {
                  return;
                }

                const loops = configuredExperimentLoops(state);
                const runningProject = getProjectById("fraud-transfer-running");
                const runningState = createAppStateFromProject(runningProject);

                setState({
                  ...runningState,
                  modelingRequirement: state.modelingRequirement,
                  uploadedFile: state.uploadedFile,
                  requirementSubmitted: state.modelingRequirement.trim().length > 0,
                  experimentRounds: state.experimentRounds,
                  experimentRoundsInput: state.experimentRoundsInput,
                  optimizationMetric: state.optimizationMetric,
                  optimizationTarget: state.optimizationTarget,
                  optimizationTargetInput: state.optimizationTargetInput,
                  validationRatio: state.validationRatio,
                  validationRatioInput: state.validationRatioInput,
                  experimentLoops: loops,
                  activeLoopId: loops[loops.length - 1]?.id ?? 1
                });
              }}
            />
          ) : null}

          {project.status === "running" ? (
            <ExperimentWorkspace
              state={state}
              overviewItems={getRunningOverviewMetrics(project)}
              loopLogs={runningData?.loopLogs}
              workspaceMetrics={workspaceMetrics}
              onChangeView={(view) =>
                setState((current) => ({ ...current, experimentView: view }))
              }
              onToggleSuccessful={() =>
                setState((current) => ({
                  ...current,
                  successfulOnly: !current.successfulOnly,
                  expandedExperimentId: null
                }))
              }
              onSelectLoop={(loopId) =>
                setState((current) => ({
                  ...current,
                  activeLoopId: loopId,
                  experimentView: "process",
                  expandedExperimentId: null
                }))
              }
              onToggleExperiment={(experimentId) =>
                setState((current) => ({
                  ...current,
                  expandedExperimentId:
                    current.expandedExperimentId === experimentId ? null : experimentId
                }))
              }
              onAddLoop={() => {
                const nextLoop = createGeneratedLoop(state.experimentLoops.length + 1);
                setState((current) => ({
                  ...current,
                  experimentLoops: [...current.experimentLoops, nextLoop],
                  activeLoopId: nextLoop.id,
                  experimentView: "process",
                  successfulOnly: false,
                  expandedExperimentId: null
                }));
              }}
              onGoDeploy={() =>
                setState((current) => ({
                  ...current,
                  currentStep: 2
                }))
              }
              onDownload={() =>
                downloadJson("experiment-records.json", {
                  project: state.selectedChat,
                  metric: state.optimizationMetric,
                  loops: state.experimentLoops
                })
              }
            />
          ) : null}

          {project.status === "completed" && selectedModel ? (
            <CompletedProjectResult
              project={project}
              selectedModel={selectedModel}
              onSelectModel={(modelId) =>
                setState((current) => ({
                  ...current,
                  selectedModelId: modelId
                }))
              }
            />
          ) : null}

          {project.status === "running" && state.currentStep === 2 ? (
            <DeliveryPanel
              deliveryOptions={deliveryOptions}
              experimentRun={demoExperimentRun}
              bestLoop={bestLoop}
              executedLoops={state.experimentLoops.length}
              selectedMetric={state.optimizationMetric}
              optimizationTarget={state.optimizationTarget}
              validationRatio={state.validationRatio}
              checklist={deliveryChecklist}
            />
          ) : null}
        </section>
      </main>
    </div>
  );
}
