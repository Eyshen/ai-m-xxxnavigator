import { Icon } from "@/components/common/Icon";
import type { ProjectChat } from "@/types/app";

interface SidebarProps {
  chats: ProjectChat[];
  selectedChat: string;
  onSelectChat: (name: string) => void;
  onNewChat: () => void;
}

export function Sidebar({
  chats,
  selectedChat,
  onSelectChat,
  onNewChat
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <Icon name="sparkles" size={20} color="#f7f5ea" />
        </div>
        <div>
          <div className="sidebar__title">MNavigator</div>
          <div className="sidebar__caption">Intelligent Modeling Copilot</div>
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
              className={`project-item ${selectedChat === chat.name ? "project-item--active" : ""}`}
              onClick={() => onSelectChat(chat.name)}
              type="button"
            >
              <div className="project-item__icon">
                <Icon name="messageSquare" size={15} color="#6f6a5f" />
              </div>
              <div className="project-item__body">
                <div className="project-item__name">{chat.name}</div>
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
