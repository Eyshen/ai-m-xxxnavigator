import { Icon } from "@/components/common/Icon";
import { MetricsStrip } from "@/components/charts/MetricsStrip";
import type {
  ExperimentLoop,
  FrontendAppState,
  OverviewMetricItem,
  RunningPlaybackLog,
  RunningPlaybackLoopItem,
  TrainingLoopLog,
  WorkspaceMetrics
} from "@/types/app";

interface ExperimentWorkspaceProps {
  state: FrontendAppState;
  overviewItems?: OverviewMetricItem[];
  loopLogs?: RunningPlaybackLog[] | TrainingLoopLog[];
  playbackLoops?: RunningPlaybackLoopItem[];
  playbackComplete?: boolean;
  canShowFocusedDetails?: boolean;
  currentModelLoop?: ExperimentLoop;
  currentModelComplete?: boolean;
  bestLoop?: ExperimentLoop | null;
  completedLoopCount?: number;
  workspaceMetrics: WorkspaceMetrics;
  onChangeView: (view: FrontendAppState["experimentView"]) => void;
  onToggleSuccessful: () => void;
  onSelectLoop: (loopId: number) => void;
  onToggleExperiment: (experimentId: string) => void;
  onAddLoop: () => void;
  onGoDeploy: () => void;
  onDownload: () => void;
}

function getActiveLoop(state: FrontendAppState): ExperimentLoop {
  return (
    state.experimentLoops.find((loop) => loop.id === state.activeLoopId) ??
    state.experimentLoops[state.experimentLoops.length - 1]
  );
}

function getVisibleRows(state: FrontendAppState) {
  const rows = state.experimentLoops.flatMap((loop) =>
    loop.components.map((component) => ({ loop, component }))
  );

  return state.successfulOnly
    ? rows.filter(({ component }) => component.status === "success")
    : rows;
}

function getStatusLabel(status: "success" | "failed") {
  return status === "success" ? "已验证" : "已排除";
}

function getVisibleFeedback(log: RunningPlaybackLog | TrainingLoopLog) {
  return "visibleFeedback" in log ? log.visibleFeedback : log.evaluation.feedback_analysis;
}

export function ExperimentWorkspace({
  state,
  overviewItems,
  loopLogs,
  playbackLoops,
  playbackComplete = false,
  canShowFocusedDetails = true,
  currentModelLoop,
  currentModelComplete = true,
  bestLoop: bestLoopOverride,
  completedLoopCount,
  workspaceMetrics,
  onChangeView,
  onToggleSuccessful,
  onSelectLoop,
  onToggleExperiment,
  onAddLoop,
  onGoDeploy,
  onDownload
}: ExperimentWorkspaceProps) {
  const activeLoop = getActiveLoop(state);
  const heroLoop = currentModelLoop ?? activeLoop;
  const activeLog =
    loopLogs?.find((log) => log.loop_id === state.activeLoopId) ?? loopLogs?.[0] ?? null;
  const rows = getVisibleRows(state);
  const successCount = state.experimentLoops.filter((loop) => loop.status === "success").length;
  const bestLoop =
    bestLoopOverride ??
    state.experimentLoops.reduce(
      (winner, loop) => (loop.auc > winner.auc ? loop : winner),
      state.experimentLoops[0]
    );
  const shouldEarlyStop = Boolean(bestLoop && bestLoop.auc >= 0.85);
  const completedCount = completedLoopCount ?? state.experimentLoops.length;
  const heroSummary = currentModelComplete
    ? heroLoop.summary
    : `${heroLoop.name} 正在生成中，完成后展示摘要与指标结果。`;
  const heroMetricValue = currentModelComplete ? heroLoop.auc.toFixed(4) : "......";
  const bestLoopSummary = bestLoop
    ? `最佳模型 ${bestLoop.name}，当前 ${state.optimizationMetric} ${bestLoop.auc.toFixed(4)}`
    : `待当前 Loop 完成后展示最佳 ${state.optimizationMetric}`;
  const footerSummary = bestLoop
    ? `已完成 ${completedCount} 轮自动实验，当前最佳方案为 ${bestLoop.name}。`
    : `已完成 ${completedCount} 轮自动实验，待当前 Loop 完成后展示最佳方案。`;

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">Step 02</div>
          <h2 className="panel__title">多轮自动化实验</h2>
        </div>
        <p className="panel__desc">
          每一轮实验都会记录假设与证据，并在发现满足目标的最佳模型后支持提前收敛。
        </p>
      </div>

      <MetricsStrip state={state} workspaceMetrics={workspaceMetrics} items={overviewItems} />

      <div className="experiment-hero">
        <div>
          <div className="experiment-hero__label">当前模型</div>
          <div className="experiment-hero__title">{heroLoop.name}</div>
          <p className="experiment-hero__text">{heroSummary}</p>
        </div>
        <div className="experiment-hero__metrics">
          <article className="hero-metric">
            <span>{state.optimizationMetric}</span>
            <strong>{heroMetricValue}</strong>
          </article>
          <article className="hero-metric">
            <span>实验进度</span>
            <strong>
              {state.experimentLoops.length} / {state.experimentRounds}
            </strong>
          </article>
        </div>
      </div>

      <div className={`status-banner ${shouldEarlyStop ? "status-banner--success" : ""}`}>
        <span className="status-banner__title">
          {!bestLoop ? "当前 Loop 生成中" : shouldEarlyStop ? "已达到目标，可提前结束实验" : "实验仍在搜索更优方案"}
        </span>
        <span className="status-banner__text">
          {!bestLoop
            ? `当前暂无已完成实验结果，${heroLoop.name} 完成后将更新最佳 ${state.optimizationMetric}。`
            : shouldEarlyStop
            ? `当前最佳 ${state.optimizationMetric} 为 ${bestLoop.auc.toFixed(4)}，已满足本次演示目标。`
            : `当前最多运行 ${state.experimentRounds} 轮，若后续收益不足可保持当前最佳方案。`}
        </span>
      </div>

      <div className="toolbar">
        <div className="toggle-group">
          <button
            className={`toggle-group__button ${
              state.experimentView === "process" ? "toggle-group__button--active" : ""
            }`}
            onClick={() => onChangeView("process")}
            type="button"
          >
            <Icon
              name="database"
              size={14}
              color={state.experimentView === "process" ? "#fff8ee" : "#7d7367"}
            />
            过程追踪
          </button>
          <button
            className={`toggle-group__button ${
              state.experimentView === "result" ? "toggle-group__button--active" : ""
            }`}
            onClick={() => onChangeView("result")}
            type="button"
          >
            <Icon
              name="barChart3"
              size={14}
              color={state.experimentView === "result" ? "#fff8ee" : "#7d7367"}
            />
            结果总览
          </button>
        </div>

        <div className="toolbar__actions">
          <button className="switch-button" onClick={onToggleSuccessful} type="button">
            <span className={`switch-button__dot ${state.successfulOnly ? "switch-button__dot--on" : ""}`} />
            只看成功假设
          </button>
          <button className="btn btn--ghost" onClick={onDownload} type="button">
            <Icon name="download" size={14} color="#6c6258" />
            下载实验记录
          </button>
        </div>
      </div>

      <div className="experiment-layout">
        <aside className="loop-rail">
          <div className="loop-rail__header">
            <Icon name="zap" size={15} color="#1f6fff" />
            实验 Loops
          </div>
          {(playbackLoops ?? state.experimentLoops).map((loop) => {
            const isPending = "status" in loop && loop.status === "pending";
            const isRunning = "status" in loop && loop.status === "running";
            const isRealLoop = "auc" in loop;
            const loopId = loop.id;
            return (
              <button
                key={loop.id}
                className={`loop-item ${state.activeLoopId === loopId ? "loop-item--active" : ""} ${
                  isPending ? "loop-item--pending" : ""
                } ${isRunning ? "loop-item--running" : ""}`}
                onClick={() => !isPending && playbackComplete && onSelectLoop(loopId)}
                type="button"
                disabled={isPending || !playbackComplete}
              >
                <div className="loop-item__main">
                  <span
                    className={`loop-item__status ${
                      isPending
                        ? "loop-item__status--pending"
                        : isRunning
                          ? "loop-item__status--running"
                          : `loop-item__status--${loop.status}`
                    }`}
                  >
                    {isPending ? (
                      <span className="loop-item__dot" />
                    ) : isRunning ? (
                      <span className="loop-item__spinner" />
                    ) : loop.status === "success" ? (
                      <Icon name="check" size={13} color="#196b4d" strokeWidth={2.6} />
                    ) : (
                      <Icon name="x" size={13} color="#8f3c31" strokeWidth={2.6} />
                    )}
                  </span>
                  <div>
                    <div className="loop-item__name">{loop.name}</div>
                    <div className="loop-item__meta">
                      {"note" in loop
                        ? loop.note
                        : loop.status === "success"
                          ? "收益有效"
                          : "方案淘汰"}
                    </div>
                  </div>
                </div>
                <span className="loop-item__score">
                  {isRealLoop && !isRunning ? loop.auc.toFixed(4) : "......"}
                </span>
              </button>
            );
          })}
        </aside>

        <div className="workspace-panel">
          {state.experimentView === "process" ? (
            <div className="process-view">
              {canShowFocusedDetails ? (
                <div className="process-hero">
                  <div className="info-box">
                    <div className="info-box__title">
                      <Icon name="sparkles" size={16} color="#1f6fff" />
                      {activeLoop.name} 实验摘要
                    </div>
                    <p>{activeLoop.summary}</p>
                  </div>
                  <div className="mini-kpi-grid">
                    <article className="mini-kpi">
                      <span className="mini-kpi__label">{state.optimizationMetric}</span>
                      <strong>{activeLoop.auc.toFixed(4)}</strong>
                    </article>
                    <article className="mini-kpi">
                      <span className="mini-kpi__label">状态</span>
                      <strong>{activeLoop.status === "success" ? "推荐保留" : "不进入最终方案"}</strong>
                    </article>
                  </div>
                </div>
              ) : (
                <div className="process-hero process-hero--loading">
                  <div className="info-box">
                    <div className="info-box__title">
                      <Icon name="sparkles" size={16} color="#1f6fff" />
                      当前 Loop 生成中
                    </div>
                    <p>等待当前实验轮次完成后展示详细摘要与指标结果。</p>
                  </div>
                </div>
              )}

              {activeLog && canShowFocusedDetails ? (
                <div className="training-log-card">
                  <div className="training-log-card__header">
                    <div>
                      <div className="training-log-card__eyebrow">
                        {activeLog.scenario}
                      </div>
                      <div className="training-log-card__title">
                        Loop {activeLog.loop_id} · {activeLog.task}
                      </div>
                    </div>
                    <div className={`status-pill status-pill--${activeLog.status === "Success" ? "success" : "failed"}`}>
                      {activeLog.status}
                    </div>
                  </div>

                  <div className="training-log-grid">
                    <article className="training-log-block">
                      <div className="training-log-block__label">Meta Controller</div>
                      <div className="training-log-block__text">
                        <strong>{activeLog.meta_controller.exploration_type}</strong>
                        <br />
                        {activeLog.meta_controller.exploration_reason}
                      </div>
                    </article>
                    <article className="training-log-block">
                      <div className="training-log-block__label">Hypothesis</div>
                      <div className="training-log-block__text">
                        <strong>{activeLog.research.hypothesis_id}</strong>
                        <br />
                        {activeLog.research.hypothesis}
                        <br />
                        <br />
                        {activeLog.research.rationale}
                      </div>
                    </article>
                  </div>

                  <div className="training-log-actions">
                    {(activeLog.research.proposed_actions ?? []).map((action) => (
                      <span key={action} className="artifact-pill">
                        {action}
                      </span>
                    ))}
                  </div>

                  <div className="training-log-steps">
                    {(activeLog as RunningPlaybackLog).steps
                      ? (activeLog as RunningPlaybackLog).steps.map((step) => (
                        <article key={step.step_id} className="training-step-card">
                          <div className="training-step-card__head">
                            <div className="training-step-card__order">
                              Step {step.step_id}
                            </div>
                            <div className={`status-pill status-pill--${step.execution_status === "Success" ? "success" : "failed"}`}>
                              {step.execution_status}
                            </div>
                          </div>
                          <div className="training-step-card__title">{step.action}</div>
                          <pre
                            className={`training-step-card__code ${
                              step.visibleCode !== step.code ? "training-step-card__code--typing" : ""
                            }`}
                          >
                            {step.visibleCode || "生成中..."}
                          </pre>
                          <div
                            className={`training-step-card__log ${
                              step.visibleExecutionLog !== step.execution_log
                                ? "training-step-card__log--typing"
                                : ""
                            }`}
                          >
                            {step.visibleExecutionLog || "等待执行日志..."}
                          </div>
                          {step.agent_reflection ? (
                            <div className="training-step-card__reflection">
                              {step.agent_reflection}
                            </div>
                          ) : null}
                        </article>
                      ))
                      : activeLog.development.evolving_steps.map((step) => (
                      <article key={step.step_id} className="training-step-card">
                        <div className="training-step-card__head">
                          <div className="training-step-card__order">
                            Step {step.step_id}
                          </div>
                          <div className={`status-pill status-pill--${step.execution_status === "Success" ? "success" : "failed"}`}>
                            {step.execution_status}
                          </div>
                        </div>
                        <div className="training-step-card__title">{step.action}</div>
                        <pre className="training-step-card__code">{step.code}</pre>
                        <div className="training-step-card__log">{step.execution_log}</div>
                        {step.agent_reflection ? (
                          <div className="training-step-card__reflection">
                            {step.agent_reflection}
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>

                  <div className="training-log-grid">
                    <article className="training-log-block">
                      <div className="training-log-block__label">Evaluation Metrics</div>
                      <div className="training-metric-grid">
                        {Object.entries(activeLog.evaluation.performance.metrics).map(
                          ([name, value]) => (
                            <div key={name} className="mini-kpi">
                              <span className="mini-kpi__label">{name}</span>
                              <strong>{typeof value === "number" ? value.toFixed(3) : String(value)}</strong>
                            </div>
                          )
                        )}
                      </div>
                    </article>
                    <article className="training-log-block">
                      <div className="training-log-block__label">Feedback Analysis</div>
                      <div className="training-log-block__text">
                        {getVisibleFeedback(activeLog) || "分析生成中..."}
                      </div>
                    </article>
                  </div>
                </div>
              ) : null}

              {canShowFocusedDetails ? (
                <div className="process-stack">
                  {activeLoop.components.map((component) => (
                    <article key={component.id} className="process-card">
                      <div className="process-card__order">{component.order}</div>
                      <div className="process-card__type-block">
                        <div className="process-card__type">{component.type}</div>
                        <div className="process-card__metric">{component.metric}</div>
                      </div>
                      <div className="process-card__copy">
                        <div className="process-card__section">
                          <span className="process-card__label">Hypothesis</span>
                          {component.hypothesis}
                        </div>
                        <div className="process-card__section">
                          <span className="process-card__label">Evidence</span>
                          {component.evidence}
                        </div>
                      </div>
                      <div
                        className={`status-pill status-pill--${component.status}`}
                      >
                        {getStatusLabel(component.status)}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="result-view">
              <div className="result-summary">
                <div>
                  <div className="result-summary__label">推荐交付方案</div>
                  <div className="result-summary__title">{bestLoopSummary}</div>
                </div>
                <button className="btn btn--primary" onClick={onGoDeploy} type="button">
                  <Icon name="rocket" size={14} color="#fff8ee" />
                  进入模型交付
                </button>
              </div>

              <div className="result-table">
                <div className="result-table__header">
                  <div>Loop</div>
                  <div>组件</div>
                  <div>状态</div>
                  <div>实验假设</div>
                  <div>验证结论</div>
                  <div>详情</div>
                </div>

                {rows.map(({ loop, component }) => (
                  <div key={component.id} className="result-table__row">
                    <div className="result-table__strong">{loop.name.replace(" Loop", "")}</div>
                    <div className="result-table__strong">{component.type}</div>
                    <div>
                      <span className={`status-pill status-pill--${component.status}`}>
                        {getStatusLabel(component.status)}
                      </span>
                    </div>
                    <div className="result-table__copy">{component.hypothesis}</div>
                    <div className="result-table__copy">{component.evidence}</div>
                    <button
                      className="expand-button"
                      onClick={() => onToggleExperiment(component.id)}
                      type="button"
                    >
                      {state.expandedExperimentId === component.id ? "−" : "+"}
                    </button>
                    {state.expandedExperimentId === component.id ? (
                      <div className="result-detail">
                        <strong>
                          {loop.name} / {component.type}
                        </strong>
                        <br />
                        指标变化：{component.metric}。本轮结论：{loop.summary}
                        成功假设会沉淀到下一轮，失败假设会作为排除依据保留下来。
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="workspace-footer">
        <div className="workspace-footer__note">{footerSummary}</div>
        <button className="btn btn--secondary" onClick={onAddLoop} type="button">
          <Icon name="plus" size={14} color="#6c6258" />
          继续一轮实验
        </button>
      </div>
    </section>
  );
}
