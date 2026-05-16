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

const deployLinks = [
  { label: "使用说明页", url: "http://服务器IP:8090/usage" },
  { label: "在线文档", url: "http://服务器IP:8090/docs" },
  { label: "预测接口", url: "http://服务器IP:8090/predict" }
];

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
          <div className="panel__eyebrow">已完成项目</div>
          <h2 className="panel__title">模型结果与部署下载</h2>
        </div>
        <p className="panel__desc">
          模型生成已完成。你可以查看指标数据，并直接下载模型压缩包。
        </p>
      </div>

      <div className="completed-hero">
        <div>
          <div className="completed-hero__label">当前项目</div>
          <div className="completed-hero__title">{project.name}</div>
          {project.summary ? <p className="completed-hero__text">{project.summary}</p> : null}
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
              <div className="experiment-hero__title">风控模型</div>
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

          <section className="deploy-guide">
            <div className="deploy-guide__header">
              <div>
                <div className="deploy-guide__eyebrow">模型部署说明</div>
                <h3 className="deploy-guide__title">简单部署步骤</h3>
              </div>
              <div className="deploy-guide__badge">服务器部署</div>
            </div>

            <div className="deploy-guide__grid">
              <article className="deploy-step-card">
                <div className="deploy-step-card__index">01</div>
                <div className="deploy-step-card__body">
                  <div className="deploy-step-card__title">把项目上传到服务器</div>
                  <div className="deploy-step-card__desc">
                    将下载后的模型包上传到目标服务器，并解压到业务目录中。
                  </div>
                </div>
              </article>

              <article className="deploy-step-card">
                <div className="deploy-step-card__index">02</div>
                <div className="deploy-step-card__body">
                  <div className="deploy-step-card__title">进入项目目录</div>
                  <pre className="deploy-code-block">
                    <code>cd /root/ss/模型包名</code>
                  </pre>
                </div>
              </article>

              <article className="deploy-step-card">
                <div className="deploy-step-card__index">03</div>
                <div className="deploy-step-card__body">
                  <div className="deploy-step-card__title">启动模型服务</div>
                  <pre className="deploy-code-block">
                    <code>./start.sh</code>
                  </pre>
                </div>
              </article>

              <article className="deploy-step-card">
                <div className="deploy-step-card__index">04</div>
                <div className="deploy-step-card__body">
                  <div className="deploy-step-card__title">打开页面使用</div>
                  <div className="deploy-link-list">
                    {deployLinks.map((link) => (
                      <div key={link.url} className="deploy-link-card">
                        <div className="deploy-link-card__label">{link.label}</div>
                        <div className="deploy-link-card__url">{link.url}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </section>

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
