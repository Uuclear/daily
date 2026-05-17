import { Button, Popconfirm } from 'antd';
import { DeleteOutlined, UserOutlined } from '@ant-design/icons';
import type { ScheduleEvent, Task } from './types/models';

interface EventCardProps {
  event: ScheduleEvent;
  onDelete?: (id: string) => void;
  onEdit?: (event: ScheduleEvent) => void;
  isMobile?: boolean;
  taskColor?: string;
  tasks?: Task[];
  isFuture?: boolean;
}

// 10浅色背景
const bgColors: Record<number, { bg: string; border: string }> = {
  0: { bg: 'linear-gradient(145deg, #eef7ff 0%, #e3f0ff 100%)', border: '#b8d4f0' },
  1: { bg: 'linear-gradient(145deg, #fef5ee 0%, #fde8d8 100%)', border: '#f0ccb0' },
  2: { bg: 'linear-gradient(145deg, #f0faf2 0%, #dff0e4 100%)', border: '#b8dcc2' },
  3: { bg: 'linear-gradient(145deg, #faf4f8 0%, #f3e6ef 100%)', border: '#e0c4d8' },
  4: { bg: 'linear-gradient(145deg, #fefbf3 0%, #fdf5e3 100%)', border: '#f0dfb8' },
  5: { bg: 'linear-gradient(145deg, #f3f5fd 0%, #e4e8f8 100%)', border: '#c4cce0' },
  6: { bg: 'linear-gradient(145deg, #fdf3f3 0%, #f8e0e0 100%)', border: '#e0b8b8' },
  7: { bg: 'linear-gradient(145deg, #f5f8fa 0%, #e8eef2 100%)', border: '#c8d6e0' },
  8: { bg: 'linear-gradient(145deg, #faf8f3 0%, #f2edd8 100%)', border: '#e0d4b0' },
  9: { bg: 'linear-gradient(145deg, #f6f0fa 0%, #ece0f5 100%)', border: '#d0b8e0' },
};

function getBgStyle(taskColor?: string) {
  if (!taskColor) return { bg: bgColors[0].bg, border: bgColors[0].border };
  let hash = 0;
  for (let i = 0; i < taskColor.length; i++) hash = ((hash << 5) - hash + taskColor.charCodeAt(i)) | 0;
  return bgColors[Math.abs(hash) % 10];
}

export function EventCard({ event, onDelete, onEdit, isMobile = false, taskColor, tasks, isFuture = false }: EventCardProps) {
  const hasTaskColor = !!taskColor;
  const task = tasks?.find(t => t.id === event.task_id);
  const projectName = task?.project_name || event.title;

  const durationStr = (() => {
    const [sh, sm] = event.start_time.split(':').map(Number);
    const [eh, em] = event.end_time.split(':').map(Number);
    const totalMin = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMin <= 0) return '';
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
  })();

  const style = getBgStyle(taskColor);

  // 桌面端字体
  const titleFs = isMobile ? 12 : 15;
  const timeFs = isMobile ? 10 : 13;
  const metaFs = isMobile ? 9 : 11;
  const contentFs = isMobile ? 10 : 12;

  return (
    <div
      onContextMenu={(e) => { e.preventDefault(); onEdit?.(event); }}
      style={{
        background: isFuture ? 'linear-gradient(145deg, #e8e8e8 0%, #d8d8d8 100%)' : style.bg,
        border: isFuture ? `1px solid rgba(0, 0, 0, 0.2)` : `1px solid ${style.border}`,
        borderRadius: 10,
        padding: '4px 8px',
        marginBottom: 4,
        cursor: 'context-menu',
        boxShadow: '0 2px 6px rgba(0,0,0,0.10), 0 6px 20px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)',
        height: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        filter: isFuture ? 'grayscale(0)' : undefined,
      }}
    >
      {!isFuture && hasTaskColor && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
          background: `linear-gradient(180deg, ${taskColor}, ${taskColor}88)`,
          borderRadius: '10px 0 0 10px',
        }} />
      )}

      {/* "计划"封条 — 仅未来日程 */}
      {isFuture && (
        <div style={{
          position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)',
          background: 'rgba(40, 40, 40, 0.75)',
          color: '#fff', fontSize: isMobile ? 10 : 11, fontWeight: 700, letterSpacing: 2,
          padding: '2px 6px', borderRadius: '0 4px 4px 0',
          zIndex: 10,
        }}>
          计划
        </div>
      )}

      {/* 第1行：关联任务名称 */}
      <div style={{ paddingLeft: hasTaskColor ? 6 : 0, flexShrink: 0 }}>
        <div style={{
          fontSize: titleFs, fontWeight: 700, color: '#2c2c2c',
          lineHeight: 1.3,
          whiteSpace: isMobile ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: isMobile ? undefined : 'ellipsis',
          wordBreak: isMobile ? 'break-word' : undefined,
        }}>
          {projectName}
        </div>
      </div>

      {/* 第2行：时间 + 时长（手机端2行显示） */}
      <div style={{ paddingLeft: hasTaskColor ? 6 : 0, flexShrink: 0 }}>
        {isMobile ? (
          <div style={{ fontSize: timeFs, color: hasTaskColor ? taskColor : '#555', fontWeight: 600, lineHeight: 1.4 }}>
            <div>{event.start_time}</div>
            <div>{event.end_time}</div>
          </div>
        ) : (
          <div style={{ fontSize: timeFs, color: hasTaskColor ? taskColor : '#555', fontWeight: 600 }}>
            <span>{event.start_time} - {event.end_time}</span>
            {durationStr && (
              <span style={{ fontSize: metaFs, color: '#aaa', fontWeight: 400, marginLeft: 4 }}>{durationStr}</span>
            )}
          </div>
        )}
      </div>

      {/* 其余内容居中 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2, paddingTop: 2, paddingBottom: 2 }}>
        {/* 工作内容 */}
        <div style={{
          fontSize: contentFs, color: '#555', fontWeight: 500,
          textAlign: 'center', lineHeight: 1.3,
          maxWidth: '100%',
          whiteSpace: isMobile ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: isMobile ? undefined : 'ellipsis',
          wordBreak: isMobile ? 'break-word' : undefined,
        }}>
          {event.work_content || event.title}
        </div>

        {/* 负责人 */}
        {event.assigned_team && (
          <div style={{
            fontSize: metaFs, color: '#666', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 2,
          }}>
            <UserOutlined style={{ fontSize: 9 }} />{event.assigned_team}
          </div>
        )}

        {/* 备注 */}
        {event.notes && (
          <div style={{
            fontSize: metaFs, color: '#aaa', fontStyle: 'italic',
            textAlign: 'center', lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {event.notes}
          </div>
        )}
      </div>

      {/* 删除按钮 */}
      {onDelete && (
        <Popconfirm
          title="确认删除"
          description={`确定要删除日程「${event.title}」吗？`}
          onConfirm={() => onDelete(event.id)}
          okText="删除"
          okType="danger"
          cancelText="取消"
        >
          <Button type="text" size="small" danger
            style={{
              position: 'absolute', top: 2, right: 2,
              padding: 0, height: 'auto', fontSize: 10,
              background: 'rgba(255,255,255,0.6)', borderRadius: 3,
              zIndex: 10,
            }}
          >
            <DeleteOutlined />
          </Button>
        </Popconfirm>
      )}
    </div>
  );
}
