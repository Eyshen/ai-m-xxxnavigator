import { Icon } from "@/components/common/Icon";
import type { DeployableModel, FrontendProject } from "@/types/app";

interface CompletedProjectResultProps {
  project: FrontendProject;
  selectedModel: DeployableModel;
  onSelectModel: (modelId: string) => void;
}

function formatMetric(value?: number) {
  return typeof value === "number" ? value.toFixed(4) : "--";
}

export function CompletedProjectResult({
  project,
  selectedModel,
  onSelectModel
}: CompletedProjectResultProps) {
  const models = project.completed?.models ?? [];

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">Completed Project</div>
          <h2 className="panel__title">模型结果与部署下载</h2>
        </div>
        <p className="panel__desc">
          已完成项目默认进入结果页。你可以切换候选模型、查看指标数据，并直接下载对应模型压缩包。
        </p>
      </div>

      <div className="completed-hero">
        <div>
          <div className="completed-hero__label">当前项目</div>
          <div className="completed-hero__title">{project.name}</div>
          <p className="completed-hero__text">{project.summary}</p>
        </div>
        <div className="completed-hero__chips">
          <span className="artifact-pill">{project.dataset.name}</span>
          <span className="artifact-pill">
            {project.dataset.rows.toLocaleString()} x {project.dataset.columns}
          </span>
          <span className="artifact-pill">目标字段 {project.dataset.target}</span>
        </div>
      </div>

      <div className="completed-layout">
        <aside className="loop-rail completed-model-rail">
          <div className="loop-rail__header">
            <Icon name="rocket" size={15} color="#1f6fff" />
            可部署模型
          </div>
          {models.map((model) => (
            <button
              key={model.modelId}
              className={`loop-item ${selectedModel.modelId === model.modelId ? "loop-item--active" : ""}`}
              onClick={() => onSelectModel(model.modelId)}
              type="button"
            >
              <div className="loop-item__main">
                <span
                  className={`loop-item__status ${
                    model.status === "recommended"
                      ? "loop-item__status--success"
                      : "loop-item__status--failed"
                  }`}
                >
                  {model.status === "recommended" ? (
                    <Icon name="check" size={13} color="#196b4d" strokeWidth={2.6} />
                  ) : (
                    <Icon name="barChart3" size={13} color="#8f3c31" strokeWidth={2.6} />
                  )}
                </span>
                <div>
                  <div className="loop-item__name">{model.modelName}</div>
                  <div className="loop-item__meta">{model.version}</div>
                </div>
              </div>
              <span className="loop-item__score">{formatMetric(model.primaryMetricValue)}</span>
            </button>
          ))}
        </aside>

        <div className="workspace-panel completed-model-panel">
          <div className="result-summary">
            <div>
              <div className="result-summary__label">当前选中模型</div>
              <div className="result-summary__title">
                {selectedModel.modelName} · {selectedModel.primaryMetricName}{" "}
                {formatMetric(selectedModel.primaryMetricValue)}
              </div>
            </div>
            <a
              className="btn btn--primary"
              href={selectedModel.package.downloadUrl}
              download={selectedModel.package.packageName}
            >
              <Icon name="download" size={14} color="#fff8ee" />
              下载模型压缩包
            </a>
          </div>

          <div className="experiment-hero">
            <div>
              <div className="experiment-hero__label">模型说明</div>
              <div className="experiment-hero__title">{selectedModel.modelName}</div>
              <p className="experiment-hero__text">{selectedModel.deploymentSummary ?? selectedModel.summary}</p>
            </div>
            <div className="experiment-hero__metrics">
              <article className="hero-metric">
                <span>{selectedModel.primaryMetricName}</span>
                <strong>{formatMetric(selectedModel.primaryMetricValue)}</strong>
              </article>
              <article className="hero-metric">
                <span>模型包</span>
                <strong>{selectedModel.package.sizeLabel ?? selectedModel.package.packageName}</strong>
              </article>
            </div>
          </div>

          <div className="completed-metrics-grid">
            <article className="mini-kpi">
              <span className="mini-kpi__label">F1 Score</span>
              <strong>{formatMetric(selectedModel.f1Score)}</strong>
            </article>
            <article className="mini-kpi">
              <span className="mini-kpi__label">Accuracy</span>
              <strong>{formatMetric(selectedModel.accuracy)}</strong>
            </article>
            <article className="mini-kpi">
              <span className="mini-kpi__label">Recall</span>
              <strong>{formatMetric(selectedModel.recall)}</strong>
            </article>
            <article className="mini-kpi">
              <span className="mini-kpi__label">特征数</span>
              <strong>{selectedModel.featureCount ?? "--"}</strong>
            </article>
          </div>

          <div className="ready-box">
            <div className="ready-box__icon">
              <Icon name="check" size={28} color="#1d6f55" strokeWidth={2.7} />
            </div>
            <div className="ready-box__title">模型可直接下载部署</div>
            <div className="ready-box__desc">
              当前项目已完成，支持切换不同模型查看指标，并下载对应 mock 模型压缩包，保证演示交互完整性。
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
