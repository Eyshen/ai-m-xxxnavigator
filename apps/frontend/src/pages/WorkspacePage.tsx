import { DataIntakePanel } from "@/components/forms/DataIntakePanel";
import { ReadOnlyDataIntakePanel } from "@/components/forms/ReadOnlyDataIntakePanel";
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
  getDefaultCompletedTemplate,
  getInitialEditableProjects,
  getRunningOverviewMetrics,
  getRunningProjectData,
  initialAppState,
  initialProject,
  quickRequirementTemplates,
  workflowStages,
  workspaceMetrics
} from "@/data/mockData";
import { downloadJson } from "@/utils/download";
import type {
  ExperimentLoop,
  FrontendAppState,
  FrontendProject,
  RunningPlaybackLog,
  RunningPlaybackLoopItem,
  RunningPlaybackMetricItem,
  RunningPlaybackStep,
  TrainingEvolutionStep,
  TrainingLoopLog
} from "@/types/app";
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

function sliceTextProgressively(text: string, ratio: number) {
  const safe = text ?? "";
  if (!safe) return "";
  const length = Math.max(0, Math.min(safe.length, Math.floor(safe.length * ratio)));
  return safe.slice(0, length);
}

function getBestLoop(loops: ExperimentLoop[]) {
  if (loops.length === 0) {
    return null;
  }

  return loops.reduce((winner, loop) => (loop.auc > winner.auc ? loop : winner), loops[0]);
}

const PLAYBACK_PHASES = [
  "intro",
  "meta",
  "research",
  "actions",
  "steps",
  "evaluation",
  "feedback",
  "completed_hold",
  "done"
] as const;

type PlaybackPhase = (typeof PLAYBACK_PHASES)[number];

export function WorkspacePage() {
  const [state, setState] = useState<FrontendAppState>(initialAppState);
  const [projects, setProjects] = useState<FrontendProject[]>(getInitialEditableProjects());
  const [completedReviewStage, setCompletedReviewStage] =
    useState<FrontendAppState["currentStep"]>(2);
  const [playbackState, setPlaybackState] = useState<{
    activeLoopIndex: number;
    focusedLoopIndex: number;
    phase: PlaybackPhase;
    stepRevealIndex: number;
    textTick: number;
    playbackComplete: boolean;
    manualSelectedLoopId: number | null;
  } | null>(null);
  const project =
    projects.find((item) => item.projectId === state.projectId) ?? projects[0] ?? initialProject;
  const validationErrors = getValidationErrors(state);
  const configValid = isConfigValid(state);

  useEffect(() => {
    setCompletedReviewStage(
      project.status === "completed" ? 2 : project.status === "running" ? 1 : 0
    );
  }, [project.projectId, project.status]);

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

  useEffect(() => {
    if (project.status !== "running") {
      setPlaybackState(null);
      return;
    }

    if (state.experimentLoops.length === 0) {
      setPlaybackState(null);
      return;
    }

    setPlaybackState({
      activeLoopIndex: 0,
      focusedLoopIndex: 0,
      phase: "intro",
      stepRevealIndex: 0,
      textTick: 0,
      playbackComplete: false,
      manualSelectedLoopId: null
    });
  }, [project.status, state.projectId, state.experimentLoops]);

  useEffect(() => {
    if (project.status !== "running" || !playbackState || playbackState.playbackComplete) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPlaybackState((current) => {
        if (!current) return current;

        const currentPhaseIndex = PLAYBACK_PHASES.indexOf(current.phase);
        const currentLoop = state.experimentLoops[current.activeLoopIndex];
        const stepCount = currentLoop?.components.length ?? 0;

        if (current.phase === "steps" && current.stepRevealIndex < stepCount) {
          return {
            ...current,
            stepRevealIndex: current.stepRevealIndex + 1,
            textTick: current.textTick + 1
          };
        }

        if (current.phase === "done") {
          if (current.activeLoopIndex >= state.experimentLoops.length - 1) {
            return {
              ...current,
              playbackComplete: true,
              manualSelectedLoopId: current.manualSelectedLoopId
            };
          }

          return {
            activeLoopIndex: current.activeLoopIndex + 1,
            focusedLoopIndex: current.focusedLoopIndex,
            phase: "intro",
            stepRevealIndex: 0,
            textTick: 0,
            playbackComplete: false,
            manualSelectedLoopId: current.manualSelectedLoopId
          };
        }

        if (current.phase === "feedback") {
          return {
            ...current,
            focusedLoopIndex: current.activeLoopIndex,
            phase: "completed_hold",
            textTick: current.textTick + 1,
            playbackComplete: false,
            manualSelectedLoopId:
              state.experimentLoops[current.activeLoopIndex]?.id ??
              current.manualSelectedLoopId
          };
        }

        return {
          ...current,
          phase: PLAYBACK_PHASES[currentPhaseIndex + 1] ?? "done",
          textTick: current.textTick + 1,
          playbackComplete: false
        };
      });
    }, playbackState.phase === "steps"
      ? 900
      : playbackState.phase === "completed_hold"
        ? playbackState.activeLoopIndex === state.experimentLoops.length - 1
          ? 1600
          : 900
        : 700);

    return () => window.clearTimeout(timer);
  }, [project.status, playbackState, state.experimentLoops]);

  const resetWorkspace = () => {
    const nextCreatedProject: FrontendProject = {
      ...initialProject,
      projectId: `created-project-${Date.now()}`,
      name: `新建模项目 ${projects.length + 1}`,
      time: "刚刚",
      summary: "新项目待创建，请填写建模要求并上传数据。"
    };

    setProjects((current) => [
      ...current,
      nextCreatedProject
    ]);
    setState(createAppStateFromProject(nextCreatedProject));
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
  const currentPlaybackLoop =
    project.status === "running" && playbackState
      ? state.experimentLoops[playbackState.activeLoopIndex] ?? null
      : null;
  const currentLoopCompleted =
    project.status !== "running" ||
    !playbackState ||
    playbackState.playbackComplete ||
    playbackState.phase === "completed_hold" ||
    playbackState.phase === "done";
  const revealedLoopCount =
    project.status === "running" && playbackState
      ? Math.min(playbackState.activeLoopIndex + 1, state.experimentLoops.length)
      : state.experimentLoops.length;
  const completedLoopCount =
    project.status === "running" && playbackState
      ? playbackState.playbackComplete
        ? state.experimentLoops.length
        : Math.min(
            playbackState.activeLoopIndex + (currentLoopCompleted ? 1 : 0),
            state.experimentLoops.length
          )
      : state.experimentLoops.length;
  const visibleExperimentLoops =
    project.status === "running"
      ? state.experimentLoops.slice(0, revealedLoopCount)
      : state.experimentLoops;
  const completedExperimentLoops =
    project.status === "running"
      ? state.experimentLoops.slice(0, completedLoopCount)
      : state.experimentLoops;
  const playbackLoops: RunningPlaybackLoopItem[] =
    project.status === "running"
      ? state.experimentLoops.map((loop, index) => {
          const isVisible = index < revealedLoopCount;
          const isCurrent =
            Boolean(
              playbackState &&
                index === playbackState.activeLoopIndex &&
                !playbackState.playbackComplete &&
                playbackState.phase !== "completed_hold" &&
                playbackState.phase !== "done"
            );
          if (!isVisible) {
            return {
              id: loop.id,
              name: `${String(loop.id).padStart(2, "0")} Loop`,
              status: "pending",
              note: "等待生成"
            };
          }
          return {
            id: loop.id,
            name: loop.name,
            status: isCurrent ? "running" : loop.status,
            score: loop.auc,
            note: isCurrent ? "模型生成中" : loop.status === "success" ? "收益有效" : "方案淘汰"
          };
        })
      : [];
  const visiblePlaybackLoops =
    project.status === "running"
      ? playbackLoops.filter((loop, index) => index < revealedLoopCount)
      : playbackLoops;
  const bestCompletedLoop = getBestLoop(completedExperimentLoops);
  const focusedLoopId =
    project.status === "running" && playbackState
      ? playbackState.playbackComplete && playbackState.manualSelectedLoopId
        ? playbackState.manualSelectedLoopId
        : visibleExperimentLoops[playbackState.focusedLoopIndex]?.id ??
        visibleExperimentLoops[visibleExperimentLoops.length - 1]?.id ??
        state.activeLoopId
      : state.activeLoopId;
  const canShowFocusedDetails = currentLoopCompleted;
  const playbackComplete = project.status !== "running" || !playbackState || playbackState.playbackComplete;
  const playbackMetrics: RunningPlaybackMetricItem[] =
    project.status === "running"
      ? (getRunningOverviewMetrics(project) ?? []).map((item, index) => ({
          ...item,
          value:
            index === 2
              ? String(playbackLoops.filter((loop) => loop.status === "success").length)
              : index === 3
                ? bestCompletedLoop?.auc.toFixed(4) ?? "--"
                : index === 4
                  ? String(
                      visibleExperimentLoops.flatMap((loop) => loop.components).length
                    )
                  : item.value,
          revealed: revealedLoopCount >= Math.min(index + 1, 2)
        }))
      : [];
  const playbackLogs: RunningPlaybackLog[] =
    project.status === "running"
      ? (runningData?.loopLogs ?? []).map((log: TrainingLoopLog, index: number) => {
          const loopIsVisible = index < revealedLoopCount;
          const isCurrentLoop =
            playbackState && index === playbackState.activeLoopIndex;
          const phase = isCurrentLoop ? playbackState.phase : "done";
          const textTick = isCurrentLoop ? playbackState.textTick : 999;
          const actionCount =
            phase === "actions" || phase === "steps" || phase === "evaluation" || phase === "feedback" || phase === "done"
              ? log.research.proposed_actions.length
              : 0;
          const feedbackRatio =
            phase === "feedback"
              ? Math.min(1, Math.max(0, textTick / 8))
              : phase === "done"
                ? 1
                : 0;
          const steps: RunningPlaybackStep[] = log.development.evolving_steps.map((step: TrainingEvolutionStep, stepIndex: number) => {
            const stepIsVisible =
              phase === "steps" || phase === "evaluation" || phase === "feedback" || phase === "done"
                ? stepIndex < (isCurrentLoop ? playbackState.stepRevealIndex : log.development.evolving_steps.length)
                : false;
            const codeRatio = stepIsVisible
              ? Math.min(1, Math.max(0, textTick / 6))
              : 0;
            const logRatio = stepIsVisible
              ? Math.min(1, Math.max(0, (textTick - 2) / 6))
              : 0;
            return {
              ...step,
              visibleCode: loopIsVisible ? sliceTextProgressively(step.code, codeRatio) : "",
              visibleExecutionLog: loopIsVisible
                ? sliceTextProgressively(step.execution_log, logRatio)
                : "",
              revealed: loopIsVisible && stepIsVisible
            };
          });

          return {
            ...log,
            revealedActions: loopIsVisible ? log.research.proposed_actions.slice(0, actionCount) : [],
            visibleFeedback: loopIsVisible
              ? sliceTextProgressively(log.evaluation.feedback_analysis, feedbackRatio)
              : "",
            steps
          };
        })
      : [];
  const selectedModel =
    completedData?.models.find((model) => model.modelId === state.selectedModelId) ??
    completedData?.models[0] ??
    null;
  const completedExperimentLogs = completedData?.experimentSnapshot?.loopLogs ?? [];

  const stageMetricName =
    project.status === "completed" && selectedModel
      ? selectedModel.primaryMetricName
      : state.optimizationMetric;
  const stageMetricValue =
    project.status === "completed" && selectedModel
      ? selectedModel.primaryMetricValue.toFixed(4)
      : state.currentStep === 0
        ? null
        : bestCompletedLoop?.auc.toFixed(4) ?? null;
  return (
    <div className="app-shell">
      <Sidebar
        chats={projects.map((item, index) => ({
          id: index + 1,
          projectId: item.projectId,
          name: item.name,
          time: item.time,
          status: item.status,
          summary: item.summary
        }))}
        selectedProjectId={state.projectId}
        onSelectChat={(projectId) => {
          const nextProject = projects.find((item) => item.projectId === projectId);
          if (!nextProject) return;
          setState(createAppStateFromProject(nextProject));
        }}
        onNewChat={resetWorkspace}
        onRenameChat={(projectId, nextName) => {
          setProjects((current) =>
            current.map((chat) =>
              chat.projectId === projectId ? { ...chat, name: nextName } : chat
            )
          );

          if (state.projectId === projectId) {
            setState((current) => ({
              ...current,
              selectedChat: nextName
            }));
          }
        }}
      />

      <main className="app-main">
        <Topbar
          title={state.selectedChat}
          currentStep={project.status === "completed" ? completedReviewStage : state.currentStep}
          uploadedFile={state.uploadedFile}
          isProcessing={state.isProcessing}
        />

        <section className="workspace-content">
          <StageProgress
            stages={workflowStages}
            currentStep={state.currentStep}
            selectedStageId={project.status === "completed" ? completedReviewStage : undefined}
            uploadedFile={state.uploadedFile}
            experimentRounds={state.experimentRounds}
            validationRatio={state.validationRatio}
            metricName={stageMetricName}
            bestMetric={stageMetricValue}
            interactive={project.status === "completed"}
            forceCompletedProgress={project.status === "completed"}
            onSelectStage={
              project.status === "completed" ? (stageId) => setCompletedReviewStage(stageId) : undefined
            }
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
                const runningTemplate =
                  projects.find((item) => item.projectId === "fraud-transfer-running") ?? project;
                const nextProject: FrontendProject = {
                  ...project,
                  status: "running",
                  entryView: "running",
                  summary: "项目进行中，正在持续生成实验过程与结果数据。",
                  running: {
                    ...(runningTemplate.running ?? {
                      currentStep: 1,
                      overviewMetrics: [],
                      loops: [],
                      activeLoopId: 1,
                      loopLogs: []
                    }),
                    loops,
                    activeLoopId: loops[0]?.id ?? 1
                  }
                };
                const runningState = createAppStateFromProject(nextProject);

                setProjects((current) =>
                  current.map((item) =>
                    item.projectId === project.projectId ? nextProject : item
                  )
                );

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
                  activeLoopId: loops[0]?.id ?? 1
                });
              }}
            />
          ) : null}

          {project.status === "running" ? (
            <ExperimentWorkspace
              state={{
                ...state,
                experimentLoops: visibleExperimentLoops,
                activeLoopId: focusedLoopId
              }}
              overviewItems={playbackMetrics}
              loopLogs={playbackLogs.filter(
                (log) =>
                  visibleExperimentLoops.find((loop) => loop.id === log.loop_id) !== undefined
              )}
              playbackLoops={visiblePlaybackLoops}
              playbackComplete={playbackComplete}
              canShowFocusedDetails={canShowFocusedDetails}
              currentModelLoop={!playbackComplete ? currentPlaybackLoop ?? undefined : undefined}
              currentModelComplete={currentLoopCompleted}
              bestLoop={bestCompletedLoop}
              completedLoopCount={completedLoopCount}
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
              onSelectLoop={(loopId) => {
                if (!playbackComplete) return;
                setState((current) => ({
                  ...current,
                  activeLoopId: loopId,
                  experimentView: "process",
                  expandedExperimentId: null
                }));
                setPlaybackState((current) =>
                  current
                    ? {
                        ...current,
                        manualSelectedLoopId: loopId
                      }
                    : current
                );
              }}
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
              onGoDeploy={() => {
                const completedTemplate = getDefaultCompletedTemplate();
                const nextProject: FrontendProject = {
                  ...project,
                  status: "completed",
                  entryView: "completed",
                  summary: "项目已完成，当前可选择部署模型并下载对应模型压缩包。",
                  completed: {
                    currentStep: 2,
                    defaultSelectedModelId:
                      completedTemplate.defaultSelectedModelId,
                    models: completedTemplate.models,
                    intakeSnapshot: {
                      modelingRequirement: state.modelingRequirement,
                      experimentRounds: state.experimentRounds,
                      optimizationMetric: state.optimizationMetric,
                      optimizationTarget: state.optimizationTarget,
                      validationRatio: state.validationRatio,
                      uploadedFile: state.uploadedFile ?? project.dataset.name
                    },
                    experimentSnapshot: {
                      loops: cloneExperimentLoops(state.experimentLoops),
                      activeLoopId: bestLoop.id,
                      loopLogs: runningData?.loopLogs ?? []
                    }
                  }
                };
                const completedState = createAppStateFromProject(nextProject);

                setProjects((current) =>
                  current.map((item) =>
                    item.projectId === project.projectId ? nextProject : item
                  )
                );

                setState({
                  ...completedState,
                  selectedChat: project.name
                });
                setCompletedReviewStage(2);
              }}
              onDownload={() =>
                downloadJson("experiment-records.json", {
                  project: state.selectedChat,
                  metric: state.optimizationMetric,
                  loops: state.experimentLoops
                })
              }
            />
          ) : null}

          {project.status === "completed" && selectedModel && completedReviewStage === 0 ? (
            <ReadOnlyDataIntakePanel
              state={state}
              datasetSummary={datasetSummary}
            />
          ) : null}

          {project.status === "completed" && selectedModel && completedReviewStage === 1 ? (
            <ExperimentWorkspace
              state={state}
              loopLogs={completedExperimentLogs}
              reviewMode
              playbackComplete
              canShowFocusedDetails
              bestLoop={bestLoop}
              completedLoopCount={state.experimentLoops.length}
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
              onAddLoop={() => {}}
              onGoDeploy={() => {}}
              onDownload={() => {}}
            />
          ) : null}

          {project.status === "completed" && selectedModel && completedReviewStage === 2 ? (
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
