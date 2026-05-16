import { Icon } from "@/components/common/Icon";
import type { ProjectChat } from "@/types/app";
import { useEffect, useState } from "react";

interface SidebarProps {
  chats: ProjectChat[];
  selectedProjectId: string;
  onSelectChat: (projectId: string) => void;
  onNewChat: () => void;
  onRenameChat: (projectId: string, nextName: string) => void;
}

export function Sidebar({
  chats,
  selectedProjectId,
  onSelectChat,
  onNewChat,
  onRenameChat
}: SidebarProps) {
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    if (!editingProjectId) return;
    const current = chats.find((chat) => chat.projectId === editingProjectId);
    if (!current) {
      setEditingProjectId(null);
      setEditingValue("");
      return;
    }
    setEditingValue(current.name);
  }, [editingProjectId, chats]);

  const submitRename = () => {
    if (!editingProjectId) return;
    const nextName = editingValue.trim();
    if (!nextName) {
      setEditingProjectId(null);
      return;
    }
    onRenameChat(editingProjectId, nextName);
    setEditingProjectId(null);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <img className="sidebar__logo-image" src="/shanghaiyinhanglogo.png" alt="上海银行 logo" />
        </div>
        <div>
          <div className="sidebar__title">上海银行端到端多Agent自动化建模</div>
          <div className="sidebar__caption">Modeling Workspace</div>
        </div>
      </div>

      <button className="btn btn--primary btn--block" onClick={onNewChat} type="button">
        <Icon name="plus" size={16} color="#fff7e8" />
        新建项目
      </button>

      <div className="sidebar__section">
        <div className="sidebar__section-label">项目列表</div>
        <div className="sidebar__projects">
          {chats.map((chat) => (
            <button
              key={chat.id}
              className={`project-item ${selectedProjectId === chat.projectId ? "project-item--active" : ""}`}
              onClick={() => onSelectChat(chat.projectId)}
              type="button"
            >
              <div className="project-item__icon">
                <Icon name="messageSquare" size={15} color="#6f6a5f" />
              </div>
              <div className="project-item__body">
                <div className="project-item__title-row">
                  {editingProjectId === chat.projectId ? (
                    <input
                      autoFocus
                      className="project-item__input"
                      value={editingValue}
                      onChange={(event) => setEditingValue(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onBlur={submitRename}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          submitRename();
                        }
                        if (event.key === "Escape") {
                          setEditingProjectId(null);
                        }
                      }}
                    />
                  ) : (
                    <div className="project-item__name">{chat.name}</div>
                  )}
                  <span
                    className="project-item__edit"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingProjectId(chat.projectId);
                      setEditingValue(chat.name);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setEditingProjectId(chat.projectId);
                        setEditingValue(chat.name);
                      }
                    }}
                  >
                    <Icon name="pencil" size={14} color="#7d9ab6" />
                  </span>
                </div>
                <div className="project-item__meta">
                  {chat.time}
                  <span className={`project-item__status project-item__status--${chat.status}`}>
                    {chat.status === "completed"
                      ? "Completed"
                      : chat.status === "running"
                        ? "Running"
                        : "Created"}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar__user">
        <div className="sidebar__avatar">用</div>
        <div>
          <div className="sidebar__user-name">用户</div>
          <div className="sidebar__user-role">体验创新 / 黑客松</div>
        </div>
      </div>
    </aside>
  );
}
