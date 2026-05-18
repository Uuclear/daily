import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { Button, message, Badge, Dropdown, Space } from 'antd';
import {
  DownOutlined,
  UpOutlined,
  PlusOutlined,
  ReloadOutlined,
  LogoutOutlined,
  SearchOutlined,
  LoginOutlined,
  BellOutlined,
  EnvironmentOutlined,
  SettingOutlined,
  LeftOutlined,
  RightOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { TaskPool } from '../../TaskPool';
import { WeekCalendar } from '../../WeekCalendar';
import { SearchModal } from '../../SearchModal';
import { LoginModal } from '../../LoginModal';
import { useResponsive } from '../../hooks/useResponsive';
import { useAuth } from '../../auth/AuthContext';
import { useSchedule } from '../../hooks/useSchedule';
import {
  getNotificationSettings,
  getUpcomingNotifications,
  type NotificationSettings,
  type UpcomingNotification,
} from '../../api/client';
import type { Task, ScheduleEvent } from '../../types/models';
import dayjs from 'dayjs';

export function Dashboard() {
  const { isMobile } = useResponsive();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isLoggedIn = !!user;

  // Schedule state controlled by Dashboard
  const {
    schedule,
    loading: scheduleLoading,
    currentWeekStart,
    prevWeek,
    nextWeek,
    goToToday,
    goToWeek,
    addEvent,
    updateEvent,
    removeEvent,
    updateSummary,
  } = useSchedule();

  const [taskPoolCollapsed, setTaskPoolCollapsed] = useState(false);
  const [taskPoolCreate, setTaskPoolCreate] = useState(false);
  const [taskPoolRefresh, setTaskPoolRefresh] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [upcoming, setUpcoming] = useState<UpcomingNotification>({ tasks: [], events: [] });
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    reminder_days: 3,
    reminder_time: '08:00',
    notify_on_deadline: true,
    notify_on_schedule: true,
  });
  const [navPos, setNavPos] = useState({ left: window.innerWidth - 500, top: 8 });
  const navDragging = useRef(false);
  const navOffset = useRef({ x: 0, y: 0 });

  // Week jump target (for search result click)
  const [jumpToDate, setJumpToDate] = useState<string | null>(null);

  // Ref to WeekCalendar for export and create modal
  const weekCalendarRef = useRef<{
    openCreateModal: (date?: string) => void;
    handleExportImage: () => void;
  } | null>(null);

  // Fetch notifications if logged in
  useEffect(() => {
    if (!isLoggedIn) return;
    const fetch = async () => {
      try {
        const data = await getUpcomingNotifications();
        setUpcoming(data);
        setNotificationCount(data.tasks.length + data.events.length);
      } catch {}
    };
    fetch();
    const timer = setInterval(fetch, 60_000);
    return () => clearInterval(timer);
  }, [isLoggedIn]);

  // Fetch notification settings if logged in
  useEffect(() => {
    if (!isLoggedIn) return;
    getNotificationSettings()
      .then(setSettings)
      .catch(() => {});
  }, [isLoggedIn]);

  // Nav dragging (desktop)
  useEffect(() => {
    if (isMobile) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!navDragging.current) return;
      const dx = e.clientX - navOffset.current.x;
      const dy = e.clientY - navOffset.current.y;
      setNavPos(prev => {
        const newLeft = Math.max(0, Math.min(window.innerWidth - 300, prev.left + dx));
        const newTop = Math.max(0, Math.min(window.innerHeight - 50, prev.top + dy));
        return { left: newLeft, top: newTop };
      });
      navOffset.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseUp = () => { navDragging.current = false; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isMobile]);

  const handleTaskSelect = useCallback((task: Task) => {
    setHighlightedTaskId(task.id);
    setTaskPoolCollapsed(false);
    message.info(`已选中任务: ${task.project_name}`);
  }, []);

  const handleEventSelect = useCallback((event: ScheduleEvent) => {
    message.info(`已选中日程: ${event.title} (${event.date})`);
    setJumpToDate(event.date);
  }, []);

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
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

  // Get today's date for create modal default
  const todayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const visibleDates = (schedule?.dates || []).slice(0, isMobile ? 5 : 7);
  const todayIndex = visibleDates.indexOf(todayLocal());

  // Desktop floating nav bar
  const desktopNavBar = (
    <div
      style={{
        position: 'absolute',
        top: navPos.top,
        left: navPos.left,
        zIndex: 50,
        cursor: 'grab',
        opacity: 0.92,
      }}
      onMouseDown={(e) => {
        navDragging.current = true;
        navOffset.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }}
    >
      <div style={{
        padding: '5px 10px',
        background: 'rgba(26,26,46,0.88)',
        backdropFilter: 'blur(20px)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {/* Coordinate icon placeholder */}
        <EnvironmentOutlined style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }} />

        {/* Divider */}
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.2)' }} />

        {/* User info or login */}
        {isLoggedIn ? (
          <>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.display_name || user?.username}
            </span>
            <Button type="text" size="small" style={{ color: '#fff', padding: '0 4px', height: 24 }} onClick={handleLogout}>
              <LogoutOutlined style={{ fontSize: 12 }} />
            </Button>
          </>
        ) : (
          <Button type="text" size="small" style={{ color: '#fff', padding: '0 4px', height: 24 }} onClick={() => setLoginOpen(true)}>
            <LoginOutlined style={{ fontSize: 12, marginRight: 4 }} />
            登录
          </Button>
        )}

        {/* Divider */}
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.2)' }} />

        {/* Notification bell */}
        {isLoggedIn && (
          <Dropdown
            open={notificationOpen}
            onOpenChange={setNotificationOpen}
            trigger={['click']}
            dropdownRender={() => (
              <div style={{
                background: '#fff',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: 260,
                maxHeight: 400,
                overflow: 'auto',
                padding: 12,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>通知中心</div>
                {upcoming.tasks.length === 0 && upcoming.events.length === 0 ? (
                  <div style={{ color: '#999', padding: 8 }}>暂无即将到期的事项</div>
                ) : (
                  <>
                    {upcoming.tasks.map(t => (
                      <div key={t.id} style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <span style={{ fontWeight: 500 }}>{t.project_name}</span>
                        <span style={{ color: '#ff4d4f', marginLeft: 8 }}>{t.deadline}</span>
                      </div>
                    ))}
                    {upcoming.events.map(e => (
                      <div key={e.id} style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <span style={{ fontWeight: 500 }}>{e.title}</span>
                        <span style={{ color: '#666', marginLeft: 8 }}>{e.date}</span>
                      </div>
                    ))}
                  </>
                )}
                <Button type="link" style={{ marginTop: 8 }} onClick={() => { setNotificationOpen(false); setNotificationSettingsOpen(true); }}>
                  <SettingOutlined /> 通知设置
                </Button>
              </div>
            )}
          >
            <Badge count={notificationCount} size="small" offset={[2, 0]}>
              <Button type="text" size="small" style={{ color: '#fff', padding: '0 4px', height: 24 }}>
                <BellOutlined style={{ fontSize: 14 }} />
              </Button>
            </Badge>
          </Dropdown>
        )}

        {/* Search */}
        <Button type="text" size="small" style={{ color: '#fff', padding: '0 4px', height: 24 }} onClick={() => setSearchOpen(true)}>
          <SearchOutlined style={{ fontSize: 12 }} />
        </Button>

        {/* Divider */}
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.2)' }} />

        {/* Week navigation */}
        <Button type="text" size="small" style={{ color: '#fff', padding: '0 4px', height: 24 }} onClick={prevWeek}>
          <LeftOutlined style={{ fontSize: 12 }} />
        </Button>
        <Button type="text" size="small" style={{ color: '#1890ff', padding: '0 6px', height: 24, fontWeight: 500 }} onClick={goToToday}>
          今日
        </Button>
        <Button type="text" size="small" style={{ color: '#fff', padding: '0 4px', height: 24 }} onClick={nextWeek}>
          <RightOutlined style={{ fontSize: 12 }} />
        </Button>

        {/* Divider */}
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.2)' }} />

        {/* Export */}
        <Button type="text" size="small" style={{ color: '#fff', padding: '0 4px', height: 24 }} onClick={() => weekCalendarRef.current?.handleExportImage()}>
          <DownloadOutlined style={{ fontSize: 12 }} />
        </Button>

        {/* Add schedule */}
        {!isLoggedIn ? null : (
          <Button type="text" size="small" style={{ color: '#52c41a', padding: '0 6px', height: 24 }} onClick={() => weekCalendarRef.current?.openCreateModal(todayIndex >= 0 ? visibleDates[todayIndex] : visibleDates[0])}>
            <PlusOutlined style={{ fontSize: 12, marginRight: 2 }} />
            添加
          </Button>
        )}
      </div>
    </div>
  );

  // Mobile header
  const mobileHeader = (
    <div style={{
      background: '#fff',
      padding: '6px 12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #e8e8e8',
      flexShrink: 0,
    }}>
      <div onClick={() => setTaskPoolCollapsed(p => !p)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
        <strong style={{ fontSize: 14 }}>项目任务池</strong>
        {taskPoolCollapsed ? <DownOutlined style={{ fontSize: 10, color: '#999' }} /> : <UpOutlined style={{ fontSize: 10, color: '#999' }} />}
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {isLoggedIn ? (
          <>
            <span style={{ fontSize: 12, color: '#666', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.display_name || user?.username}
            </span>
            <Button size="small" icon={<LogoutOutlined />} onClick={handleLogout} />
          </>
        ) : (
          <Button size="small" type="primary" onClick={() => setLoginOpen(true)}>登录</Button>
        )}
        <Button size="small" icon={<SearchOutlined />} onClick={() => setSearchOpen(true)} />
        {!taskPoolCollapsed && isLoggedIn && (
          <>
            <Button size="small" icon={<ReloadOutlined />} onClick={() => setTaskPoolRefresh(true)} />
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setTaskPoolCreate(true)}>新建</Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <DndContext onDragEnd={handleDragEnd}>
        <div style={{ display: isMobile ? 'flex' : 'flex', flexDirection: isMobile ? 'column' : 'row', height: isMobile ? '100dvh' : '100vh', background: '#f5f5f5' }}>
          {/* Desktop: floating nav bar */}
          {!isMobile && desktopNavBar}

          {/* Mobile header */}
          {isMobile && mobileHeader}

          {/* TaskPool */}
          <div style={{
            width: isMobile ? '100%' : '22%',
            height: isMobile ? (taskPoolCollapsed ? 0 : '38vh') : '100%',
            overflow: 'hidden',
            transition: isMobile ? 'height 0.25s ease' : undefined,
            boxShadow: isMobile ? undefined : '2px 0 8px rgba(0,0,0,0.06)',
            background: '#fff',
            position: 'relative',
            zIndex: 10,
          }}>
            <TaskPool
              compact={isMobile}
              readOnly={!isLoggedIn}
              showCreate={taskPoolCreate}
              showRefresh={taskPoolRefresh}
              onCreated={() => setTaskPoolCreate(false)}
              onRefreshed={() => setTaskPoolRefresh(false)}
            />
          </div>

          {/* WeekCalendar */}
          <div style={{ width: isMobile ? '100%' : '78%', height: isMobile ? 'auto' : '100%', flex: isMobile ? 1 : undefined, overflow: 'hidden', background: '#fff' }}>
            <WeekCalendar
              ref={weekCalendarRef}
              schedule={schedule}
              loading={scheduleLoading}
              currentWeekStart={currentWeekStart}
              onPrevWeek={prevWeek}
              onNextWeek={nextWeek}
              onGoToToday={goToToday}
              onGoToWeek={goToWeek}
              onAddEvent={addEvent}
              onUpdateEvent={updateEvent}
              onRemoveEvent={removeEvent}
              onUpdateSummary={updateSummary}
              visibleDays={isMobile ? 5 : 7}
              isMobile={isMobile}
              readOnly={!isLoggedIn}
              jumpToDate={jumpToDate}
              onJumpComplete={() => setJumpToDate(null)}
              hideDesktopNav={!isMobile}
            />
          </div>
        </div>
      </DndContext>

      {/* Search Modal */}
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onTaskSelect={handleTaskSelect}
        onEventSelect={handleEventSelect}
      />

      {/* Login Modal */}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />

      {/* Notification Settings Modal (mobile) */}
      {isMobile && isLoggedIn && (
        <NotificationSettingsModal
          open={notificationSettingsOpen}
          onClose={() => setNotificationSettingsOpen(false)}
          settings={settings}
          onSave={setSettings}
        />
      )}
    </>
  );
}

// Mobile notification settings modal
function NotificationSettingsModal({ open, onClose, settings, onSave }: {
  open: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  onSave: (s: NotificationSettings) => void;
}) {
  const [local, setLocal] = useState(settings);
  useEffect(() => { setLocal(settings); }, [settings, open]);
  return (
    <div style={{ display: open ? 'block' : 'none', position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)' }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '12px 12px 0 0', padding: 16, maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>通知设置</div>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>启用通知</span>
            <input type="checkbox" checked={local.enabled} onChange={e => setLocal({ ...local, enabled: e.target.checked })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>提前提醒天数</span>
            <input type="number" min={1} max={7} value={local.reminder_days} onChange={e => setLocal({ ...local, reminder_days: parseInt(e.target.value) || 1 })} style={{ width: 50 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>提醒时间</span>
            <input type="time" value={local.reminder_time} onChange={e => setLocal({ ...local, reminder_time: e.target.value })} style={{ width: 80 }} />
          </div>
        </Space>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Button onClick={onClose} style={{ flex: 1 }}>取消</Button>
          <Button type="primary" onClick={() => { onSave(local); onClose(); }} style={{ flex: 1 }}>保存</Button>
        </div>
      </div>
    </div>
  );
}