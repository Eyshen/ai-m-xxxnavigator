import type { StageId } from "@/types/app";

interface TopbarProps {
  title: string;
  currentStep: StageId;
  uploadedFile: string | null;
  isProcessing: boolean;
}

const stageLabels = ["Data Intake", "Experiment", "Delivery"];

export function Topbar({ title, currentStep, uploadedFile, isProcessing }: TopbarProps) {
  const dataStatus = isProcessing
    ? "数据解析中"
    : uploadedFile
      ? "数据已接入"
      : "等待上传";

  return (
    <header className="topbar">
      <div className="topbar__copy">
        <div className="topbar__eyebrow">New Project</div>
        <h1 className="topbar__title">{title}</h1>
        <p className="topbar__subtitle">
          从数据上传到模型交付的项目状态驱动式前端演示工作台
        </p>
      </div>
      <div className="topbar__meta">
        <div className="topbar__badge">Stage · {stageLabels[currentStep]}</div>
        <div className={`topbar__badge ${uploadedFile ? "topbar__badge--success" : ""}`}>
          {dataStatus}
        </div>
      </div>
    </header>
  );
}
