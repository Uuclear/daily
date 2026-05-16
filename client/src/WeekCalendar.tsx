import { useState, useEffect, useRef, useCallback } from 'react';
import dayjs from 'dayjs';
import { Button, Spin, Modal, Form, Input, Select, DatePicker, Switch, Space, message, TimePicker } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { ScheduleEvent, Task } from './types/models';
import { WeatherCard } from './WeatherCard';
import { EventCard } from './EventCard';
import { useSchedule } from './hooks/useSchedule';
import { useWeather } from './hooks/useWeather';
import * as api from './api/client';

const { TextArea } = Input;
const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const TIME_AXIS_WIDTH = 48;
const SUMMARY_HEIGHT = 120;
const TOTAL_HOURS = 24;
const PX_PER_HOUR = 50;
const SCROLL_HOUR = 8;

/** Get local date string YYYY-MM-DD without timezone issues */
function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function WeekCalendar() {
  const { schedule, loading, currentWeekStart, prevWeek, nextWeek, goToToday, addEvent, updateEvent, removeEvent, updateSummary } = useSchedule();
  const { weather, loading: weatherLoading } = useWeather();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [summaryItems, setSummaryItems] = useState<Record<string, string[]>>({});
  const [newSummaryItem, setNewSummaryItem] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [persons, setPersons] = useState<string[]>([]);
  const [navPos, setNavPos] = useState<{ left: number; top: number }>({ left: window.innerWidth - 280, top: 8 });
  const calendarRef = useRef<HTMLDivElement>(null);
  const navDragging = useRef(false);
  const navOffset = useRef({ x: 0, y: 0 });

  // Fetch tasks and persons
  useEffect(() => {
    api.getTasks().then(setTasks).catch(() => setTasks([]));
    api.getPersons().then(setPersons).catch(() => setPersons([]));
  }, []);

  // Auto-scroll to 8am: use a ref-based approach that fires every time loading changes to false
  const scrollTargetRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading) {
      scrollTargetRef.current = SCROLL_HOUR * PX_PER_HOUR;
    }
  }, [loading, currentWeekStart]);

  useEffect(() => {
    if (scrollTargetRef.current !== null && calendarRef.current) {
      calendarRef.current.scrollTop = scrollTargetRef.current;
      scrollTargetRef.current = null;
    }
  });

  const today = localDateString(new Date());
  const todayIndex = schedule.dates.indexOf(today);

  const weatherMap: Record<string, any> = {};
  weather.forEach(w => { weatherMap[w.date] = w; });

  const initSummaryItems = (date: string) => {
    if (!(date in summaryItems)) {
      const summary = schedule.summaries[date];
      summaryItems[date] = summary?.content ? summary.content.split('\n').filter(Boolean) : [];
      setSummaryItems(prev => ({ ...prev, [date]: [...summaryItems[date]] }));
    }
  };

  const openCreateModal = (date: string, time?: string) => {
    const timeVal = time ? dayjs(time, 'HH:mm') : dayjs().hour(8).minute(0).second(0).millisecond(0);
    createForm.setFieldsValue({
      date: dayjs(date),
      title: '',
      start_time: timeVal,
      end_time: null,
      work_content: '',
      is_milestone: false,
      task_id: null,
      assigned_team: null,
      location: '',
      notes: '',
    });
    setCreateModalOpen(true);
  };

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    const startTime = values.start_time ? values.start_time.format('HH:mm') : '';
    const endTime = values.end_time ? values.end_time.format('HH:mm') : '';
    try {
      await addEvent({
        task_id: values.task_id || null,
        date: values.date ? values.date.format('YYYY-MM-DD') : '',
        start_time: startTime,
        end_time: endTime || startTime,
        title: values.title,
        work_content: values.work_content || '',
        is_milestone: values.is_milestone ? 1 : 0,
        assigned_team: values.assigned_team || null,
        location: values.location || '',
        notes: values.notes || '',
      });
      setCreateModalOpen(false);
      createForm.resetFields();
      message.success('日程添加成功');
    } catch (e: any) {
      if (e?.response?.data?.error) {
        message.error(e.response.data.error);
      } else {
        message.error('添加失败，请重试');
      }
    }
  };

  const openEditModal = (ev: ScheduleEvent) => {
    setEditingEvent(ev);
    editForm.setFieldsValue({
      title: ev.title,
      date: dayjs(ev.date),
      start_time: dayjs(ev.start_time, 'HH:mm'),
      end_time: ev.end_time ? dayjs(ev.end_time, 'HH:mm') : null,
      work_content: ev.work_content || '',
      assigned_team: ev.assigned_team,
      location: ev.location,
      is_milestone: !!ev.is_milestone,
      notes: ev.notes || '',
      task_id: ev.task_id,
    });
    setEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (!editingEvent) return;
    const values = await editForm.validateFields();
    const startTime = values.start_time ? values.start_time.format('HH:mm') : '';
    const endTime = values.end_time ? values.end_time.format('HH:mm') : '';
    try {
      await updateEvent(editingEvent.id, {
        date: values.date ? values.date.format('YYYY-MM-DD') : editingEvent.date,
        start_time: startTime,
        end_time: endTime || startTime,
        title: values.title,
        work_content: values.work_content || '',
        assigned_team: values.assigned_team || null,
        location: values.location || '',
        is_milestone: values.is_milestone ? 1 : 0,
        notes: values.notes || '',
      });
      setEditModalOpen(false);
      editForm.resetFields();
      setEditingEvent(null);
      message.success('日程已更新');
    } catch (e: any) {
      if (e?.response?.data?.error) {
        message.error(e.response.data.error);
      } else {
        message.error('更新失败，请重试');
      }
    }
  };

  const handleAddSummaryItem = (date: string) => {
    const text = (newSummaryItem[date] || '').trim();
    if (!text) return;
    initSummaryItems(date);
    const updated = [...(summaryItems[date] || []), text];
    setSummaryItems(prev => ({ ...prev, [date]: updated }));
    setNewSummaryItem(prev => ({ ...prev, [date]: '' }));
    updateSummary(date, updated.join('\n'));
  };

  const handleRemoveSummaryItem = (date: string, index: number) => {
    initSummaryItems(date);
    const updated = [...(summaryItems[date] || [])];
    updated.splice(index, 1);
    setSummaryItems(prev => ({ ...prev, [date]: updated }));
    updateSummary(date, updated.join('\n'));
  };

  const handlePersonSelect = (value: string) => {
    if (!persons.includes(value)) {
      api.addPerson(value).then(() => setPersons(prev => [...prev, value])).catch(() => {});
    }
  };

  // Nav dragging
  const handleNavMouseDown = (e: React.MouseEvent) => {
    navDragging.current = true;
    navOffset.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!navDragging.current) return;
      const dx = e.clientX - navOffset.current.x;
      const dy = e.clientY - navOffset.current.y;
      setNavPos(prev => {
        const newLeft = Math.max(0, Math.min(window.innerWidth - 200, prev.left + dx));
        const newTop = Math.max(0, Math.min(window.innerHeight - 50, prev.top + dy));
        return { left: newLeft, top: newTop };
      });
      navOffset.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseUp = () => { navDragging.current = false; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>

      {/* Navigation bar - draggable */}
      <div
        style={{
          position: 'absolute',
          top: navPos.top,
          left: navPos.left,
          zIndex: 50,
          cursor: 'grab',
          opacity: 0.92,
        }}
        onMouseDown={handleNavMouseDown}
      >
        <div style={{
          padding: '5px 8px',
          background: 'rgba(26,26,46,0.88)',
          backdropFilter: 'blur(20px)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Button type="text" size="small" style={{ color: '#fff', width: 28, minWidth: 28, padding: 0, height: 24 }} onClick={prevWeek}>
            <LeftOutlined style={{ fontSize: 10 }} />
          </Button>
          <Button type="primary" size="small" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', width: 48, minWidth: 48, padding: 0, height: 24, borderRadius: 8, fontWeight: 500 }} onClick={goToToday}>
            今日
          </Button>
          <Button type="text" size="small" style={{ color: '#fff', width: 28, minWidth: 28, padding: 0, height: 24 }} onClick={nextWeek}>
            <RightOutlined style={{ fontSize: 10 }} />
          </Button>
        </div>
      </div>

      {weatherLoading || loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* Header Row */}
          <HeaderRow
            dates={schedule.dates}
            today={today}
            weatherMap={weatherMap}
            timeAxisWidth={TIME_AXIS_WIDTH}
          />

          {/* Calendar area */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div ref={calendarRef} style={{ display: 'flex', flex: 1, overflow: 'auto', minHeight: 0 }}>
              {/* Time axis */}
              <TimeAxis totalHours={TOTAL_HOURS} pxPerHour={PX_PER_HOUR} />

              {/* Day columns */}
              <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                {schedule.dates.map((date, idx) => {
                  const events = schedule.events[date] || [];
                  const dayWeather = weatherMap[date];
                  const isRainy = dayWeather?.outdoorWarning;
                  const isToday = date === today;
                  initSummaryItems(date);

                  return (
                    <WeekDayColumn
                      key={date}
                      date={date}
                      events={events}
                      isRainy={!!isRainy}
                      isToday={isToday}
                      isLastDay={idx === 6}
                      totalHours={TOTAL_HOURS}
                      pxPerHour={PX_PER_HOUR}
                      onDelete={removeEvent}
                      onEdit={openEditModal}
                      onDoubleClick={(timeStr) => openCreateModal(date, timeStr)}
                    />
                  );
                })}

                {/* Today timeline */}
                {todayIndex >= 0 && (
                  <TodayTimelineOverlay todayIndex={todayIndex} totalDays={schedule.dates.length} pxPerHour={PX_PER_HOUR} totalHeight={PX_PER_HOUR * TOTAL_HOURS} />
                )}
              </div>
            </div>

            {/* Daily Summaries Row */}
            <div style={{ display: 'flex', borderTop: '1px solid #f0f0f0', background: '#fafbfc', height: SUMMARY_HEIGHT, flexShrink: 0 }}>
              <div style={{ width: TIME_AXIS_WIDTH, flexShrink: 0, background: '#fafbfc', borderRight: '1px solid #f0f0f0' }} />
              {schedule.dates.map((date, idx) => {
                initSummaryItems(date);
                const items = summaryItems[date] || [];
                return (
                  <div key={date} style={{ flex: 1, borderRight: idx < 6 ? '1px solid #f0f0f0' : 'none', padding: '4px 6px', overflowY: 'auto' }}>
                    {items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, fontSize: 10 }}>
                        <span style={{ color: '#1890ff', fontSize: 8 }}>•</span>
                        <span style={{ flex: 1 }}>{item}</span>
                        <Button size="small" type="text" style={{ padding: 0, height: 'auto', fontSize: 10, color: '#ccc' }} onClick={() => handleRemoveSummaryItem(date, i)}>×</Button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                      <Input size="small" placeholder="添加..." value={newSummaryItem[date] || ''} onChange={(e) => setNewSummaryItem(prev => ({ ...prev, [date]: e.target.value }))} onPressEnter={() => handleAddSummaryItem(date)} style={{ fontSize: 10, flex: 1 }} />
                      <Button size="small" type="link" style={{ padding: 0, height: 'auto', fontSize: 10 }} onClick={() => handleAddSummaryItem(date)}>+</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Create Modal */}
      <Modal
        title="添加日程事件"
        open={createModalOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        okText="添加"
        cancelText="取消"
        getContainer={document.body}
        maskClosable={false}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="title" label="事件标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="如：基础拆除" />
          </Form.Item>
          <Form.Item name="date" label="日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item name="start_time" label="工作时间（开始）" rules={[{ required: true, message: '请输入开始时间' }]} style={{ flex: 1 }}>
              <TimePicker style={{ width: '100%' }} format="HH:mm" placeholder="08:00" />
            </Form.Item>
            <Form.Item name="end_time" label="工作时间（结束）" style={{ flex: 1 }}>
              <TimePicker style={{ width: '100%' }} format="HH:mm" placeholder="17:00" />
            </Form.Item>
          </Space>
          <Form.Item name="task_id" label="关联任务">
            <Select allowClear placeholder="选择关联任务" showSearch optionFilterProp="children">
              {tasks.map(t => <Select.Option key={t.id} value={t.id}>{t.project_name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="work_content" label="工作内容">
            <TextArea rows={2} placeholder="具体工作内容" />
          </Form.Item>
          <Form.Item name="assigned_team" label="负责人">
            <Select allowClear placeholder="输入或选择负责人" showSearch mode="tags" maxCount={1} onSelect={handlePersonSelect}>
              {persons.map(p => <Select.Option key={p} value={p}>{p}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="location" label="施工部位">
            <Input placeholder="如：一层A区" />
          </Form.Item>
          <Form.Item name="is_milestone" label="关键节点" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="编辑日程事件"
        open={editModalOpen}
        onOk={handleEdit}
        onCancel={() => { setEditModalOpen(false); editForm.resetFields(); setEditingEvent(null); }}
        okText="保存"
        cancelText="取消"
        getContainer={document.body}
        maskClosable={false}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="title" label="事件标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="如：基础拆除" />
          </Form.Item>
          <Form.Item name="date" label="日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item name="start_time" label="工作时间（开始）" rules={[{ required: true, message: '请输入开始时间' }]} style={{ flex: 1 }}>
              <TimePicker style={{ width: '100%' }} format="HH:mm" placeholder="08:00" />
            </Form.Item>
            <Form.Item name="end_time" label="工作时间（结束）" style={{ flex: 1 }}>
              <TimePicker style={{ width: '100%' }} format="HH:mm" placeholder="17:00" />
            </Form.Item>
          </Space>
          <Form.Item name="task_id" label="关联任务">
            <Select allowClear placeholder="选择关联任务" showSearch optionFilterProp="children">
              {tasks.map(t => <Select.Option key={t.id} value={t.id}>{t.project_name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="work_content" label="工作内容">
            <TextArea rows={2} placeholder="具体工作内容" />
          </Form.Item>
          <Form.Item name="assigned_team" label="负责人">
            <Select allowClear placeholder="输入或选择负责人" showSearch mode="tags" maxCount={1} onSelect={handlePersonSelect}>
              {persons.map(p => <Select.Option key={p} value={p}>{p}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="location" label="施工部位">
            <Input placeholder="如：一层A区" />
          </Form.Item>
          <Form.Item name="is_milestone" label="关键节点" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

/** Header row - shares same flex layout as calendar body */
function HeaderRow({ dates, today, weatherMap, timeAxisWidth }: {
  dates: string[];
  today: string;
  weatherMap: Record<string, any>;
  timeAxisWidth: number;
}) {
  return (
    <div style={{ display: 'flex', borderBottom: '2px solid #e8e8e8', background: '#fafbfc', flexShrink: 0 }}>
      <div style={{ width: timeAxisWidth, flexShrink: 0, background: '#fafbfc' }} />
      {dates.map((date, idx) => (
        <div key={date} style={{ flex: 1, borderRight: idx < 6 ? '1px solid #e8e8e8' : 'none' }}>
          <div style={{ fontWeight: 600, fontSize: 13, textAlign: 'center', padding: '6px 0', color: date === today ? '#1890ff' : '#1a1a2e' }}>
            {dayNames[idx]} <span style={{ color: '#999', fontWeight: 400, fontSize: 11 }}>{formatDateShort(date)}</span>
            {date === today && <span style={{ color: '#ff4d4f', fontSize: 10 }}> 今天</span>}
          </div>
          {weatherMap[date] ? <WeatherCard weather={weatherMap[date]} /> : null}
        </div>
      ))}
    </div>
  );
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function TimeAxis({ totalHours, pxPerHour }: { totalHours: number; pxPerHour: number }) {
  return (
    <div style={{ width: TIME_AXIS_WIDTH, flexShrink: 0, background: '#fafbfc', borderRight: '1px solid #e8e8e8', position: 'relative' }}>
      {Array.from({ length: totalHours }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: i * pxPerHour,
            left: 0,
            right: 0,
            fontSize: 9,
            color: '#bbb',
            textAlign: 'right',
            paddingRight: 6,
            paddingTop: 1,
            lineHeight: 1,
          }}
        >
          {String(i).padStart(2, '0')}
        </div>
      ))}
    </div>
  );
}

function WeekDayColumn({ date, events, isRainy, isToday, isLastDay, pxPerHour, totalHours, onDelete, onEdit, onDoubleClick }: {
  date: string;
  events: ScheduleEvent[];
  isRainy: boolean;
  isToday: boolean;
  isLastDay: boolean;
  pxPerHour: number;
  totalHours: number;
  onDelete: (id: string) => void;
  onEdit: (event: ScheduleEvent) => void;
  onDoubleClick: (timeStr: string) => void;
}) {
  const handleDblClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const eventEl = target.closest('[data-event-id]');
    if (eventEl) {
      const eventId = eventEl.getAttribute('data-event-id');
      const ev = events.find(ev => ev.id === eventId);
      if (ev) {
        onEdit(ev);
        return;
      }
    }
    // Calculate time from click position within the scrollable calendar
    const scrollContainer = e.currentTarget.closest('[style*="overflow"]') as HTMLElement | null;
    const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + scrollTop;
    const clickedHour = y / pxPerHour;
    const h = Math.max(0, Math.min(23, Math.floor(clickedHour)));
    const m = Math.max(0, Math.min(59, Math.round((clickedHour - h) * 60)));
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onDoubleClick(timeStr);
  };

  return (
    <div
      onDoubleClick={handleDblClick}
      style={{
        flex: 1,
        borderRight: isLastDay ? 'none' : '1px solid #e8e8e8',
        position: 'relative',
        height: totalHours * pxPerHour,
        background: isRainy ? '#fff8f0' : isToday ? '#f8faff' : 'transparent',
      }}
    >
      {Array.from({ length: totalHours }, (_, i) => (
        <div key={i} style={{ position: 'absolute', top: i * pxPerHour, left: 0, right: 0, borderTop: '1px dashed #f0f0f0', pointerEvents: 'none' }} />
      ))}
      {isRainy && (
        <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 8, padding: '4px 8px', marginBottom: 4, fontSize: 10, color: '#ff4d4f', fontWeight: 500 }}>
          雨天户外作业提醒
        </div>
      )}
      {events.map(event => {
        const [startH, startM] = event.start_time.split(':').map(Number);
        const [endH, endM] = event.end_time.split(':').map(Number);
        const startVal = startH + startM / 60;
        const endVal = endH + endM / 60;
        const topPx = startVal * pxPerHour;
        const heightPx = Math.max(28, (endVal - startVal) * pxPerHour);

        return (
          <div
            key={event.id}
            data-event-id={event.id}
            style={{
              position: 'absolute',
              left: 4,
              right: 4,
              top: topPx,
              height: heightPx,
              zIndex: 5,
            }}
          >
            <EventCard event={event} onDelete={onDelete} onEdit={onEdit} />
          </div>
        );
      })}
    </div>
  );
}

function TodayTimelineOverlay({ todayIndex, totalDays, pxPerHour, totalHeight }: { todayIndex: number; totalDays: number; pxPerHour: number; totalHeight: number }) {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;
  const topPx = hours * pxPerHour;
  if (topPx > totalHeight) return null;

  const colLeftPercent = (todayIndex / totalDays) * 100;
  const colWidthPercent = 100 / totalDays;

  return (
    <div
      style={{
        position: 'absolute',
        top: topPx,
        left: `${colLeftPercent}%`,
        width: `${colWidthPercent}%`,
        height: 0,
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      <div style={{ position: 'absolute', left: 0, right: 0, display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4d4f', flexShrink: 0, marginLeft: 2 }} />
        <div style={{ flex: 1, height: 2, background: '#ff4d4f', opacity: 0.6 }} />
      </div>
      <div style={{ position: 'absolute', left: -4, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#ff4d4f' }} />
    </div>
  );
}
