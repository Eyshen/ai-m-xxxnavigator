import { Icon } from "@/components/common/Icon";
import type { DeliveryOption, ExperimentLoop } from "@/types/app";
import type { ExperimentRun } from "@shared/types/experiment";

interface DeliveryPanelProps {
  deliveryOptions: DeliveryOption[];
  experimentRun: ExperimentRun;
  bestLoop: ExperimentLoop;
  executedLoops: number;
  selectedMetric: string;
  optimizationTarget: number;
  validationRatio: number;
  checklist: string[];
}

export function DeliveryPanel({
  deliveryOptions,
  experimentRun,
  bestLoop,
  executedLoops,
  selectedMetric,
  optimizationTarget,
  validationRatio,
  checklist
}: DeliveryPanelProps) {
  const bestMetric = experimentRun.result.bestMetric;

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">Step 03</div>
          <h2 className="panel__title">模型交付与导出</h2>
        </div>
        <p className="panel__desc">
          汇总自动实验产出的最佳模型、关键指标与可下载文件，用于最终交付展示。
        </p>
      </div>

      <div className="delivery-hero">
        <article className="delivery-summary-card">
          <div className="delivery-summary-card__eyebrow">最佳模型输出</div>
          <h3 className="delivery-summary-card__title">{experimentRun.result.summary}</h3>
          <p className="delivery-summary-card__text">
            当前演示基于 {experimentRun.dataset.name}，本次共执行 {executedLoops} 轮自动实验，
            最终推荐 {bestLoop.name} 作为最佳交付方案。
          </p>
          <div className="delivery-metrics">
            <div className="delivery-metric">
              <span>{bestMetric?.name ?? selectedMetric}</span>
              <strong>{bestMetric?.value?.toFixed(4) ?? "--"}</strong>
            </div>
            <div className="delivery-metric">
              <span>目标值</span>
              <strong>
                {selectedMetric} {optimizationTarget.toFixed(2)}
              </strong>
            </div>
            <div className="delivery-metric">
              <span>验证集比例</span>
              <strong>{validationRatio}%</strong>
            </div>
          </div>
        </article>

        <article className="delivery-checklist-card">
          <div className="delivery-checklist-card__title">交付就绪说明</div>
          <div className="delivery-checklist">
            {checklist.map((item) => (
              <div key={item} className="delivery-checklist__item">
                <span className="delivery-checklist__icon">
                  <Icon name="check" size={14} color="#9ee6c8" strokeWidth={2.7} />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="delivery-grid">
        {deliveryOptions.map((option) => (
          <article key={option.title} className="delivery-card">
            <div className="delivery-card__icon">
              <Icon name={option.icon} size={22} color="#0071e3" />
            </div>
            <div className="delivery-card__title">{option.title}</div>
            <div className="delivery-card__desc">{option.desc}</div>
          </article>
        ))}
      </div>

      <div className="artifact-strip">
        {experimentRun.result.artifacts?.map((artifact) => (
          <div key={artifact.name} className="artifact-pill">
            <Icon
              name={artifact.type === "chart" ? "barChart3" : "fileText"}
              size={15}
              color="#9fc3ff"
            />
            <span>{artifact.name}</span>
          </div>
        ))}
      </div>

      <div className="ready-box">
        <div className="ready-box__icon">
          <Icon name="check" size={28} color="#1d6f55" strokeWidth={2.7} />
        </div>
        <div className="ready-box__title">模型结果已准备就绪</div>
        <div className="ready-box__desc">
          从数据上传到实验分析，再到交付导出，这套轻量前端已经把智能建模助手的完整链路串起来了，适合快速部署和持续修改 UI 展示。
        </div>
      </div>
    </section>
  );
}
