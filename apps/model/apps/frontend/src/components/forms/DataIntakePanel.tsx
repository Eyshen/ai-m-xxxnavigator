import { Icon } from "@/components/common/Icon";
import type { FrontendAppState } from "@/types/app";

interface DataIntakePanelProps {
  state: FrontendAppState;
  validationErrors: Partial<
    Record<"experimentRounds" | "validationRatio" | "optimizationTarget", string>
  >;
  configValid: boolean;
  requirementTemplates: string[];
  datasetSummary: {
    fields: number;
    rows: number;
    target: string;
    source: string;
  };
  onRequirementChange: (value: string) => void;
  onMetricChange: (value: FrontendAppState["optimizationMetric"]) => void;
  onRoundsChange: (value: string) => void;
  onValidationRatioChange: (value: string) => void;
  onOptimizationTargetChange: (value: string) => void;
  onFileUpload: (fileName: string) => void;
  onSubmitRequirement: () => void;
}

export function DataIntakePanel({
  state,
  validationErrors,
  configValid,
  requirementTemplates,
  datasetSummary,
  onRequirementChange,
  onMetricChange,
  onRoundsChange,
  onValidationRatioChange,
  onOptimizationTargetChange,
  onFileUpload,
  onSubmitRequirement
}: DataIntakePanelProps) {
  const hasFile = Boolean(state.uploadedFile);
  const canSubmit = hasFile && !state.isProcessing && configValid;
  const requirementReady = state.modelingRequirement.trim().length > 0;

  let hint = "";
  if (state.isProcessing) {
    hint = "正在解析数据结构，请稍候…";
  } else if (!configValid) {
    hint = "请先修正自动实验配置中的输入规则，再进入多轮自动实验。";
  } else if (!hasFile) {
    hint = "请先上传数据文件；解析完成后即可提交需求并进入多轮自动实验。";
  } else if (!requirementReady) {
    hint = "数据文件已就绪，可直接提交；补充建模要求后，模型实验会更精准。";
  } else {
    hint = "数据和建模要求都已就绪，提交后将进入自动实验工作流。";
  }

  const templateToUse =
    requirementTemplates.find((template) => template !== state.modelingRequirement) ??
    requirementTemplates[0];

  return (
    <section className="panel panel--intake">
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">Step 01</div>
          <h2 className="panel__title">数据接入与建模输入</h2>
        </div>
        <p className="panel__desc">
          填写本次建模要求，设置实验上限并上传训练数据，系统会在得到满足要求的模型后提前终止实验。
        </p>
      </div>

      <div className="phase-glance">
        <article className="phase-glance__card">
          <span className="phase-glance__label">建模要求</span>
          <strong className="phase-glance__value">{requirementReady ? "已填写" : "待填写"}</strong>
          <span className="phase-glance__meta">先描述本次建模要求</span>
        </article>
        <article className="phase-glance__card">
          <span className="phase-glance__label">自动实验配置</span>
          <strong className="phase-glance__value">{configValid ? "规则通过" : "待校验"}</strong>
          <span className="phase-glance__meta">
            {state.experimentRounds} 轮 / {state.validationRatio}% 验证集
          </span>
        </article>
        <article className="phase-glance__card">
          <span className="phase-glance__label">训练数据</span>
          <strong className="phase-glance__value">{hasFile ? "已上传" : "待上传"}</strong>
          <span className="phase-glance__meta">{datasetSummary.source}</span>
        </article>
        <article className="phase-glance__card">
          <span className="phase-glance__label">目标指标</span>
          <strong className="phase-glance__value">
            {state.optimizationMetric} {state.optimizationTarget.toFixed(2)}
          </strong>
          <span className="phase-glance__meta">目标指标</span>
        </article>
      </div>

      <div className="intake-grid">
        <article className="input-card input-card--dialogue">
          <div className="input-card__header input-card__header--stack">
            <div className="input-card__badge">
              <Icon name="messageSquare" size={18} color="#eff8ff" />
            </div>
            <div className="input-card__body">
              <div className="input-card__eyebrow">优先输入</div>
              <h3 className="input-card__title">请先描述本次建模要求</h3>
              <p className="input-card__text">
                用自然语言说明预测目标、样本范围、业务口径和交付要求，便于快速调整 UI 展示时仍保持内容一致。
              </p>
            </div>
          </div>
          <div className="input-card__body">
            <textarea
              className="input-textarea"
              placeholder="例如：请基于客户交易、收入、存款和信用额度数据，建立信用卡逾期风险预测模型，重点识别未来30天可能逾期的高风险客户，并输出可解释的关键影响因素。"
              value={state.modelingRequirement}
              onChange={(event) => onRequirementChange(event.target.value)}
            />
            <div className="input-card__tip">
              建议包含：预测目标、样本范围、评估指标、交付形式、解释要求。
            </div>
            <button
              className="inline-link"
              type="button"
              onClick={() => onRequirementChange(templateToUse)}
            >
              填入推荐提示词
            </button>
            {hasFile && !state.isProcessing ? (
              <div className="inline-success">
                数据已解析，可提交需求进入多轮自动实验。
              </div>
            ) : null}
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
                设置自动实验的搜索上限。实际运行可能在达到目标后提前终止，不一定跑满最大轮次。
              </p>
            </div>
          </div>

          <div className="config-grid">
            <label className="field">
              <span className="field__label">目标优化指标</span>
              <div className="field__split">
                <select
                  className="field__select"
                  value={state.optimizationMetric}
                  onChange={(event) =>
                    onMetricChange(event.target.value as FrontendAppState["optimizationMetric"])
                  }
                >
                  {["AUC", "KS", "F1 Score", "Accuracy", "Recall"].map((metric) => (
                    <option key={metric} value={metric}>
                      {metric}
                    </option>
                  ))}
                </select>
                <input
                  className={`field__input ${validationErrors.optimizationTarget ? "field__input--invalid" : ""}`}
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  placeholder="0.95"
                  value={state.optimizationTargetInput}
                  onChange={(event) => onOptimizationTargetChange(event.target.value)}
                />
              </div>
              <span className={`field__message ${validationErrors.optimizationTarget ? "field__message--error" : ""}`}>
                {validationErrors.optimizationTarget ??
                  `填写 ${state.optimizationMetric} 目标值，范围限制在 0 到 1。`}
              </span>
            </label>

            <label className="field">
              <span className="field__label">实验轮次</span>
              <div className="field__input-row">
                <input
                  className={`field__input ${validationErrors.experimentRounds ? "field__input--invalid" : ""}`}
                  type="number"
                  min="1"
                  max="8"
                  step="1"
                  value={state.experimentRoundsInput}
                  onChange={(event) => onRoundsChange(event.target.value)}
                />
                <span className="field__value field__value--suffix">轮</span>
              </div>
              <span className={`field__message ${validationErrors.experimentRounds ? "field__message--error" : ""}`}>
                {validationErrors.experimentRounds ?? "直接输入轮次，不再使用拖拽条。"}
              </span>
            </label>

            <label className="field">
              <span className="field__label">验证集比例</span>
              <div className="field__input-row">
                <input
                  className={`field__input ${validationErrors.validationRatio ? "field__input--invalid" : ""}`}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={state.validationRatioInput}
                  onChange={(event) => onValidationRatioChange(event.target.value)}
                />
                <span className="field__value field__value--suffix">%</span>
              </div>
              <span className={`field__message ${validationErrors.validationRatio ? "field__message--error" : ""}`}>
                {validationErrors.validationRatio ??
                  `输入 ${state.validationRatioInput || state.validationRatio}% 时将按百分比展示。`}
              </span>
            </label>
          </div>

          <div className="config-footnote">
            当前将优先优化 {state.optimizationMetric} {state.optimizationTarget.toFixed(2)}，
            并保留每一轮实验的假设、证据和指标变化。
          </div>
        </article>
      </div>

      <article className="upload-card">
        <div className="input-card__header">
          <div className="input-card__icon">
            <Icon name="upload" size={20} color="#1f6fff" />
          </div>
          <div>
            <div className="input-card__eyebrow">上传文件模块</div>
            <h3 className="input-card__title">上传训练数据并等待结构解析</h3>
            <p className="input-card__text">
              保留当前演示数据与展示内容，只优化上传和状态感知，让页面更适合快速部署和反复调 UI。
            </p>
          </div>
        </div>
        <div className="upload-card__chips">
          <span className={`upload-card__chip ${hasFile && !state.isProcessing ? "upload-card__chip--success" : ""}`}>
            {hasFile ? (state.isProcessing ? "解析中" : "已上传") : "待上传"}
          </span>
          <span className="upload-card__chip">{datasetSummary.fields} 个字段</span>
          <span className="upload-card__chip">{datasetSummary.rows.toLocaleString()} 条样本</span>
          <span className="upload-card__chip">目标字段 {datasetSummary.target}</span>
        </div>
        <label className={`dropzone ${state.isProcessing ? "dropzone--busy" : ""}`}>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onFileUpload(file.name);
              }
            }}
          />
          <div className="dropzone__icon">
            <Icon name="upload" size={30} color="#8fd4ff" />
          </div>
          <div className="dropzone__title">
            {state.uploadedFile ? `已上传: ${state.uploadedFile}` : "点击上传或拖拽文件到此处"}
          </div>
          <div className="dropzone__subtitle">
            支持 CSV、Excel、JSON 格式，将自动识别样本量、字段数与字段类型
          </div>
        </label>
      </article>

      {state.isProcessing ? (
        <div className="loading-box">
          <div className="spinner" />
          <span>正在解析数据结构，识别字段类型...</span>
        </div>
      ) : null}

      <div className="submit-bar">
        <p className="submit-bar__hint">{hint}</p>
        <button
          className="btn btn--primary"
          disabled={!canSubmit}
          onClick={onSubmitRequirement}
          type="button"
        >
          <Icon name="play" size={14} color="#fff8ee" />
          提交需求
        </button>
      </div>
    </section>
  );
}
