import { Icon } from "@/components/common/Icon";
import type { FrontendAppState } from "@/types/app";

interface ReadOnlyDataIntakePanelProps {
  state: FrontendAppState;
  datasetSummary: {
    fields: number;
    rows: number;
    target: string;
    source: string;
  };
}

export function ReadOnlyDataIntakePanel({
  state,
  datasetSummary
}: ReadOnlyDataIntakePanelProps) {
  return (
    <section className="panel panel--intake">
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">Step 01</div>
          <h2 className="panel__title">数据接入与建模输入</h2>
        </div>
        <p className="panel__desc">
          以下内容为实验执行时固化的输入快照，仅支持回看，不可修改。
        </p>
      </div>

      <div className="phase-glance">
        <article className="phase-glance__card">
          <span className="phase-glance__label">建模要求</span>
          <strong className="phase-glance__value">已固化</strong>
          <span className="phase-glance__meta">回看提交时的提示词内容</span>
        </article>
        <article className="phase-glance__card">
          <span className="phase-glance__label">自动实验配置</span>
          <strong className="phase-glance__value">{state.experimentRounds} 轮</strong>
          <span className="phase-glance__meta">实验轮次与目标指标设置</span>
        </article>
        <article className="phase-glance__card">
          <span className="phase-glance__label">训练数据</span>
          <strong className="phase-glance__value">已上传</strong>
          <span className="phase-glance__meta">{datasetSummary.source}</span>
        </article>
        <article className="phase-glance__card">
          <span className="phase-glance__label">目标指标</span>
          <strong className="phase-glance__value">
            {state.optimizationMetric} {state.optimizationTarget.toFixed(2)}
          </strong>
          <span className="phase-glance__meta">实验目标值</span>
        </article>
      </div>

      <div className="intake-grid">
        <article className="input-card input-card--dialogue">
          <div className="input-card__header input-card__header--stack">
            <div className="input-card__badge">
              <Icon name="messageSquare" size={18} color="#eff8ff" />
            </div>
            <div className="input-card__body">
              <div className="input-card__eyebrow">提示词快照</div>
              <h3 className="input-card__title">提交给系统的建模要求</h3>
              <p className="input-card__text">
                本阶段仅回看输入内容，不支持编辑或重新提交。
              </p>
            </div>
          </div>
          <div className="input-card__body">
            <div className="input-textarea input-textarea--readonly">
              {state.modelingRequirement || "未记录建模要求。"}
            </div>
          </div>
        </article>

        <article className="input-card">
          <div className="input-card__header">
            <div className="input-card__icon">
              <Icon name="settings" size={20} color="#1f6fff" />
            </div>
            <div>
              <h3 className="input-card__title">自动实验配置</h3>
              <p className="input-card__text">
                复现本次实验时所使用的目标指标、目标值和实验上限。
              </p>
            </div>
          </div>

          <div className="config-grid">
            <div className="field">
              <span className="field__label">目标优化指标</span>
              <div className="field__static">
                {state.optimizationMetric} {state.optimizationTarget.toFixed(2)}
              </div>
            </div>
            <div className="field">
              <span className="field__label">实验轮次</span>
              <div className="field__static">{state.experimentRounds} 轮</div>
            </div>
          </div>

          <div className="config-footnote">
            本阶段展示的是实验执行时的只读快照，可用于复盘但不能直接修改。
          </div>
        </article>
      </div>

      <article className="upload-card upload-card--readonly">
        <div className="input-card__header">
          <div className="input-card__icon">
            <Icon name="upload" size={20} color="#1f6fff" />
          </div>
          <div>
            <div className="input-card__eyebrow">训练数据快照</div>
            <h3 className="input-card__title">上传数据与结构摘要</h3>
            <p className="input-card__text">
              保留上传文件名、字段数、样本量和目标字段，方便回看数据接入阶段。
            </p>
          </div>
        </div>
        <div className="upload-card__chips">
          <span className="upload-card__chip upload-card__chip--success">已上传</span>
          <span className="upload-card__chip">{datasetSummary.fields} 个字段</span>
          <span className="upload-card__chip">{datasetSummary.rows.toLocaleString()} 条样本</span>
          <span className="upload-card__chip">目标字段 {datasetSummary.target}</span>
        </div>
        <div className="file-summary-card">
          <div className="dropzone__icon">
            <Icon name="upload" size={30} color="#8fd4ff" />
          </div>
          <div className="file-summary-card__body">
            <div className="dropzone__title">{datasetSummary.source}</div>
            <div className="dropzone__subtitle">
              文件已在实验启动前完成解析，当前页面仅支持回看上传结果与数据摘要。
            </div>
          </div>
          <div className="file-summary-card__meta">只读快照</div>
        </div>
      </article>
    </section>
  );
}
