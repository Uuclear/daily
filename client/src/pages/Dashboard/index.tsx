import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { TaskPool } from '../../TaskPool';
import { WeekCalendar } from '../../WeekCalendar';
import { message } from 'antd';

export function Dashboard() {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const overId = over.id as string;
    if (overId.startsWith('day-')) {
      const date = overId.replace('day-', '');
      message.success('Task dropped on ' + date);
    }
  };

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
          <WeekCalendar />
        </div>
      </div>
    </DndContext>
  );
}
