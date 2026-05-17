import { Button, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { ScheduleEvent } from './types/models';

interface EventCardProps {
  event: ScheduleEvent;
  onDelete?: (id: string) => void;
  onEdit?: (event: ScheduleEvent) => void;
  isMobile?: boolean;
}

export function EventCard({ event, onDelete, onEdit, isMobile }: EventCardProps) {
  const cardBg = event.is_milestone ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : 'linear-gradient(135deg, #f0f5ff 0%, #e8eeff 100%)';
  const borderColor = event.is_milestone ? '#fbbf24' : '#93c5fd';
  const textColor = event.is_milestone ? '#92400e' : '#1e3a5f';

  return (
    <div
      onContextMenu={(e) => { e.preventDefault(); onEdit?.(event); }}
      style={{
        background: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: '6px 8px',
        marginBottom: 4,
        cursor: 'context-menu',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
        height: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: textColor }}>
          {event.title}
        </span>
        {onDelete && (
          <Popconfirm
            title="确认删除"
            description={`确定要删除日程「${event.title}」吗？`}
            onConfirm={() => onDelete(event.id)}
            okText="删除"
            okType="danger"
            cancelText="取消"
          >
            <Button type="text" size="small" danger style={{ padding: 0, height: 'auto', fontSize: 10, flexShrink: 0 }}><DeleteOutlined /></Button>
          </Popconfirm>
        )}
      </div>
      {event.work_content && (
        <div style={{ fontSize: 10, color: '#888', marginTop: 2, lineHeight: 1.3 }}>
          {event.work_content}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
        {event.assigned_team && (
          <span style={{ fontSize: 10, color: '#aaa' }}>{event.assigned_team}</span>
        )}
        <span style={{ fontSize: 9, color: borderColor, fontWeight: 600 }}>
          {event.start_time} - {event.end_time}
        </span>
      </div>
    </div>
  );
}
