import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { Button, message } from 'antd';
import { DownOutlined, UpOutlined, PlusOutlined, ReloadOutlined, LogoutOutlined, SearchOutlined } from '@ant-design/icons';
import { TaskPool } from '../../TaskPool';
import { WeekCalendar } from '../../WeekCalendar';
import { SearchModal } from '../../SearchModal';
import { NotificationPanel } from '../../NotificationPanel';
import { useResponsive } from '../../hooks/useResponsive';
import { useAuth } from '../../auth/AuthContext';
import type { Task, ScheduleEvent } from '../../types/models';

export function Dashboard() {
  const { isMobile } = useResponsive();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [taskPoolCollapsed, setTaskPoolCollapsed] = useState(false);
  const [taskPoolCreate, setTaskPoolCreate] = useState(false);
  const [taskPoolRefresh, setTaskPoolRefresh] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  const handleTaskSelect = useCallback((task: Task) => {
    setHighlightedTaskId(task.id);
    setTaskPoolCollapsed(false);
    message.info(`已选中任务: ${task.project_name}`);
  }, []);

  const handleEventSelect = useCallback((event: ScheduleEvent) => {
    message.info(`已选中日程: ${event.title} (${event.date})`);
    // WeekCalendar can be navigated via props or context in the future
    // For now, show a message with the event info
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
        {/* Mobile header - fixed, always visible */}
        <div style={{
          background: '#fff',
          padding: '6px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: taskPoolCollapsed ? '1px solid #e8e8e8' : '1px solid #e8e8e8',
          flexShrink: 0,
        }}>
          <div
            onClick={() => setTaskPoolCollapsed(p => !p)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <strong style={{ fontSize: 14 }}>项目任务池</strong>
            {taskPoolCollapsed ? <DownOutlined style={{ fontSize: 10, color: '#999' }} /> : <UpOutlined style={{ fontSize: 10, color: '#999' }} />}
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#666', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.display_name || user?.username}
            </span>
            <Button size="small" icon={<LogoutOutlined />} onClick={handleLogout} />
            <NotificationPanel />
            <Button size="small" icon={<SearchOutlined />} onClick={() => setSearchOpen(true)} />
            <Button size="small" icon={<ReloadOutlined />} onClick={() => setTaskPoolRefresh(true)} />
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setTaskPoolCreate(true)}>
              新建任务
            </Button>
          </div>
        </div>
        {/* Mobile TaskPool content */}
        <div style={{
          height: taskPoolCollapsed ? 0 : '38vh',
          overflow: 'hidden',
          transition: 'height 0.25s ease',
        }}>
          <TaskPool compact showCreate={taskPoolCreate} showRefresh={taskPoolRefresh} onCreated={() => setTaskPoolCreate(false)} onRefreshed={() => setTaskPoolRefresh(false)} />
        </div>
        {/* Mobile WeekCalendar */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#fff' }}>
          <WeekCalendar visibleDays={5} isMobile />
        </div>
        <SearchModal
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          onTaskSelect={handleTaskSelect}
          onEventSelect={handleEventSelect}
        />
      </div>
    );
  }

  // Desktop: horizontal split
  return (
    <>
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
          <WeekCalendar
            visibleDays={7}
            isMobile={false}
            user={user}
            onLogout={handleLogout}
            onSearch={() => setSearchOpen(true)}
            notificationCount={0}
          />
        </div>
      </div>
      </DndContext>
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onTaskSelect={handleTaskSelect}
        onEventSelect={handleEventSelect}
      />
    </>
  );
}
