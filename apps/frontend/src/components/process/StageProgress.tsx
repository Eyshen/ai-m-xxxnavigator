import { Icon } from "@/components/common/Icon";
import type { StageDefinition, StageId } from "@/types/app";

interface StageProgressProps {
  stages: StageDefinition[];
  currentStep: StageId;
  uploadedFile: string | null;
  experimentRounds: number;
  validationRatio: number;
  metricName: string;
  bestMetric: string | null;
}

export function StageProgress({
  stages,
  currentStep,
  uploadedFile,
  experimentRounds,
  validationRatio,
  metricName,
  bestMetric
}: StageProgressProps) {
  const hasUploadedFile = Boolean(uploadedFile);
  const progress =
    currentStep === 0 && !hasUploadedFile
      ? 0
      : ((currentStep + 1) / stages.length) * 100;
  const currentStage = stages[currentStep];
  const summaryItems =
    currentStep === 0
      ? [
          { label: "训练数据", value: uploadedFile ? "已上传" : "待上传" },
          { label: "优化指标", value: metricName },
          { label: "最大轮次", value: `${experimentRounds} 轮` },
          { label: "验证集", value: `${validationRatio}%` }
        ]
      : [
          { label: `最佳 ${metricName}`, value: bestMetric ?? "--" },
          { label: "最大轮次", value: `${experimentRounds} 轮` },
          { label: "验证集", value: `${validationRatio}%` }
        ];

  return (
    <section className="stage-card">
      <div className="stage-card__summary">
        <div>
          <div className="stage-card__eyebrow">Workflow Progress</div>
          <div className="stage-card__title">轻量可部署的三阶段建模流程</div>
          <div className="stage-card__summary-text">
            当前阶段: {currentStage.name} · {currentStage.desc}
          </div>
        </div>
        <div className="stage-card__headline">
          <strong>{Math.round(progress)}%</strong>
          <span>当前完成度</span>
        </div>
        <div className="stage-card__meta">
          {summaryItems.map((item) => (
            <article key={item.label} className="stage-meta-card">
              <span className="stage-meta-card__label">{item.label}</span>
              <strong className="stage-meta-card__value">{item.value}</strong>
            </article>
          ))}
        </div>
      </div>
      <div className="stage-card__grid">
        {stages.map((stage, index) => {
          const isDone = currentStep > stage.id;
          const isActive = currentStep === stage.id;
          const stagePercent =
            currentStep === 0 && !hasUploadedFile && stage.id === 0
              ? 0
              : currentStep > stage.id
                ? 100
                : currentStep === stage.id
                  ? Math.round(progress)
                  : 0;

          return (
            <div
              key={stage.id}
              className={`stage-node ${currentStep < stage.id ? "stage-node--disabled" : ""} ${
                isActive ? "stage-node--active" : ""
              } ${isDone ? "stage-node--done" : ""}`}
            >
              <div className="stage-node__header">
                <div
                  className={`stage-node__icon ${isDone ? "stage-node__icon--done" : ""} ${
                    isActive ? "stage-node__icon--active" : ""
                  }`}
                >
                  {isDone ? (
                    <Icon name="check" size={22} color="#eaf7ff" strokeWidth={2.6} />
                  ) : (
                    <Icon
                      name={stage.icon}
                      size={20}
                      color={isActive ? "#eaf7ff" : "#7f9bb3"}
                    />
                  )}
                </div>
                <div className="stage-node__percent">{stagePercent}%</div>
              </div>
              <div className="stage-node__index">Stage 0{index + 1}</div>
              <div className={`stage-node__name ${isActive ? "stage-node__name--active" : ""}`}>
                {stage.name}
              </div>
              <div className="stage-node__desc">{stage.desc}</div>
              <div className="stage-node__status">
                {isDone ? "已完成" : isActive ? "进行中" : "未开始"}
              </div>
            </div>
          );
        })}
      </div>
      <div className="stage-card__track">
        <div className="stage-card__fill" style={{ width: `${progress}%` }} />
      </div>
    </section>
  );
}
