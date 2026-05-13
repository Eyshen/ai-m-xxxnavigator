import type { FrontendAppState, OverviewMetricItem, WorkspaceMetrics } from "@/types/app";

interface MetricsStripProps {
  state: FrontendAppState;
  workspaceMetrics: WorkspaceMetrics;
  items?: OverviewMetricItem[];
}

export function MetricsStrip({ state, workspaceMetrics, items }: MetricsStripProps) {
  if (items && items.length > 0) {
    return (
      <section className="metric-strip">
        {items.map((item) => (
          <article key={item.label} className="metric-card">
            <div className="metric-card__label">{item.label}</div>
            <div className="metric-card__value">{item.value}</div>
            <div className="metric-card__meta">{item.meta ?? ""}</div>
          </article>
        ))}
      </section>
    );
  }

  const successCount = state.experimentLoops.filter((loop) => loop.status === "success").length;
  const bestLoop = state.experimentLoops.reduce(
    (winner, loop) => (loop.auc > winner.auc ? loop : winner),
    state.experimentLoops[0]
  );
  const visibleItems = state.successfulOnly
    ? state.experimentLoops.flatMap((loop) =>
        loop.components.filter((component) => component.status === "success")
      ).length
    : state.experimentLoops.flatMap((loop) => loop.components).length;

  const fallbackItems = [
    { label: "识别字段", value: String(workspaceMetrics.columnsDetected), meta: "自动字段识别" },
    { label: "扫描样本", value: workspaceMetrics.rowsScanned.toLocaleString(), meta: "训练数据规模" },
    { label: "成功 Loop", value: String(successCount), meta: "收益成立方案" },
    { label: `最佳 ${state.optimizationMetric}`, value: bestLoop.auc.toFixed(4), meta: "当前最优模型" },
    { label: "运行时长", value: workspaceMetrics.latestRuntime, meta: "自动实验耗时" },
    { label: "结果项", value: String(visibleItems), meta: "可追溯实验记录" }
  ];

  return (
    <section className="metric-strip">
      {fallbackItems.map((item) => (
        <article key={item.label} className="metric-card">
          <div className="metric-card__label">{item.label}</div>
          <div className="metric-card__value">{item.value}</div>
          <div className="metric-card__meta">{item.meta}</div>
        </article>
      ))}
    </section>
  );
}
