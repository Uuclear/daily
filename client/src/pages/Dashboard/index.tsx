import { useState } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { Button } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { TaskPool } from '../../TaskPool';
import { WeekCalendar } from '../../WeekCalendar';
import { useResponsive } from '../../hooks/useResponsive';
import { message } from 'antd';

export function Dashboard() {
  const { isMobile } = useResponsive();
  const [taskPoolCollapsed, setTaskPoolCollapsed] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const overId = over.id as string;
    if (overId.startsWith('day-')) {
      const date = overId.replace('day-', '');
      message.success('Task dropped on ' + date);
    }
  };

  // Mobile: vertical stack layout
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#f5f5f5' }}>
        {/* Mobile TaskPool header */}
        <div
          onClick={() => setTaskPoolCollapsed(p => !p)}
          style={{
            background: '#fff',
            padding: '8px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: taskPoolCollapsed ? 'none' : '1px solid #e8e8e8',
            cursor: 'pointer',
          }}
        >
          <strong style={{ fontSize: 14 }}>项目任务池</strong>
          <Button type="text" size="small" style={{ padding: 0 }}>
            {taskPoolCollapsed ? <DownOutlined style={{ fontSize: 10 }} /> : <UpOutlined style={{ fontSize: 10 }} />}
          </Button>
        </div>
        {/* Mobile TaskPool content */}
        <div style={{
          height: taskPoolCollapsed ? 0 : '38vh',
          overflow: 'hidden',
          transition: 'height 0.25s ease',
        }}>
          <TaskPool />
        </div>
        {/* Mobile WeekCalendar */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#fff' }}>
          <WeekCalendar visibleDays={5} isMobile />
        </div>
      </div>
    );
  }

  // Desktop: horizontal split
  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', height: '100vh', background: '#f5f5f5' }}>
        <div style={{
          width: '22%',
          borderRight: 'none',
          overflow: 'hidden',
          boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
          background: '#fff',
          position: 'relative',
          zIndex: 10,
        }}>
          <TaskPool />
        </div>
        <div style={{ width: '78%', overflow: 'hidden', background: '#fff' }}>
          <WeekCalendar visibleDays={7} isMobile={false} />
        </div>
      </div>
    </DndContext>
  );
}
