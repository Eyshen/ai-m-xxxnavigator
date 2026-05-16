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
  { label: "预测接口", url: "http://服务器IP:8090/predict" }
];

export function CompletedProjectResult({
  project,
  selectedModel,
  onSelectModel
}: CompletedProjectResultProps) {
  const models = project.completed?.models ?? [];

  return (
    <section className="panel completed-panel">
      <div className="completed-banner">
        <div className="completed-banner__copy">
          <div className="completed-banner__eyebrow">Deployment Center</div>
          <h2 className="completed-banner__title">{project.name}</h2>
          <p className="completed-banner__text">
            模型生成已完成。你可以查看指标数据，并直接下载模型压缩包。
          </p>
        </div>
        <div className="completed-banner__status">
          <span className="completed-banner__status-label">当前状态</span>
          <strong>Ready to Deploy</strong>
        </div>
      </div>

      <div className="completed-layout">
        <aside className="loop-rail completed-model-rail">
          <div className="loop-rail__header">
            <Icon name="rocket" size={15} color="#1f6fff" />
            可部署模型
          </div>
          <div className="deploy-model-stack">
            {models.map((model) => (
              <button
                key={model.modelId}
                className={`deploy-model-card ${selectedModel.modelId === model.modelId ? "deploy-model-card--active" : ""}`}
                onClick={() => onSelectModel(model.modelId)}
                type="button"
              >
                <div className="deploy-model-card__header">
                  <span className="deploy-model-card__status">
                    <Icon name="check" size={14} color="#196b4d" strokeWidth={2.6} />
                  </span>
                  <span className="deploy-model-card__tag">可用模型</span>
                </div>
                <div className="deploy-model-card__title">{model.modelName}</div>
                <div className="deploy-model-card__meta">{model.version}</div>
                <div className="deploy-model-card__metric">
                  <span>{model.primaryMetricName}</span>
                  <strong>{formatMetric(model.primaryMetricValue)}</strong>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="workspace-panel completed-model-panel">
          <section className="deploy-result-card">
            <div className="deploy-result-card__header">
              <div>
                <div className="deploy-result-card__eyebrow">当前选中模型</div>
                <div className="deploy-result-card__title">
                  {selectedModel.modelName} · {selectedModel.primaryMetricName}{" "}
                  {formatMetric(selectedModel.primaryMetricValue)}
                </div>
              </div>
              <div className="deploy-result-card__state">模型已就绪</div>
            </div>

            <div className="deploy-result-card__actions">
              <div className="deploy-result-card__note">
                当前模型包已整理完成，可直接下载并进入部署流程。
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
          </section>

          <section className="deploy-kpi-strip">
            <article className="deploy-kpi-card">
              <span className="deploy-kpi-card__label">{selectedModel.primaryMetricName}</span>
              <strong className="deploy-kpi-card__value">
                {formatMetric(selectedModel.primaryMetricValue)}
              </strong>
              <span className="deploy-kpi-card__meta">当前最佳排序能力</span>
            </article>

            <article className="deploy-kpi-card">
              <span className="deploy-kpi-card__label">模型包</span>
              <strong className="deploy-kpi-card__value">
                {selectedModel.package.sizeLabel ?? selectedModel.package.packageName}
              </strong>
              <span className="deploy-kpi-card__meta">下载后即可部署启动</span>
            </article>
          </section>

          <section className="deploy-profile-card">
            <div className="deploy-profile-card__eyebrow">模型说明</div>
            <div className="deploy-profile-card__title">风控模型</div>
            <div className="deploy-profile-card__subtitle">
              面向交付与部署场景整理的当前最佳模型结果。
            </div>
          </section>

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
