import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import dayjs from 'dayjs';
import { Button, Spin, Modal, Form, Input, Select, DatePicker, Switch, Space, message, TimePicker, Popconfirm } from 'antd';
import { LeftOutlined, RightOutlined, PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ScheduleEvent, Task, WeekSchedule } from './types/models';
import { WeatherCard } from './WeatherCard';
import { EventCard } from './EventCard';
import { useWeather } from './hooks/useWeather';
import * as api from './api/client';
import { exportAsImage, exportAsPDF } from './utils/export';

const { TextArea } = Input;
const dayNamesFull = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const dayNamesShort = ['一', '二', '三', '四', '五'];

/** Get local date string YYYY-MM-DD without timezone issues */
function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface WeekCalendarProps {
  schedule: WeekSchedule;
  loading?: boolean;
  currentWeekStart?: string;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onGoToToday?: () => void;
  onGoToWeek?: (date: string) => void;
  onAddEvent?: (event: Omit<ScheduleEvent, 'id'>) => Promise<ScheduleEvent>;
  onUpdateEvent?: (id: string, updates: Partial<ScheduleEvent>) => Promise<ScheduleEvent>;
  onRemoveEvent?: (id: string) => Promise<void>;
  onUpdateSummary?: (date: string, content: string) => Promise<any>;
  visibleDays?: number;
  isMobile?: boolean;
  readOnly?: boolean;
  jumpToDate?: string | null;
  onJumpComplete?: () => void;
  hideDesktopNav?: boolean;
}

export interface WeekCalendarRef {
  openCreateModal: (date?: string) => void;
  handleExportImage: () => void;
}

export const WeekCalendar = forwardRef<WeekCalendarRef, WeekCalendarProps>(function WeekCalendar({
  schedule,
  loading = false,
  currentWeekStart,
  onPrevWeek,
  onNextWeek,
  onGoToToday,
  onGoToWeek,
  onAddEvent,
  onUpdateEvent,
  onRemoveEvent,
  onUpdateSummary,
  visibleDays = 7,
  isMobile = false,
  readOnly = false,
  jumpToDate,
  onJumpComplete,
  hideDesktopNav = false,
}, ref) {
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
  const [tick, setTick] = useState(0);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    openCreateModal: (date?: string) => {
      if (readOnly) return;
      const targetDate = date || (schedule?.dates?.[0] || localDateString(new Date()));
      const timeVal = dayjs().hour(8).minute(0).second(0).millisecond(0);
      createForm.setFieldsValue({
        date: dayjs(targetDate),
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
    },
    handleExportImage: async () => {
      try {
        setExporting(true);
        const element = document.getElementById('calendar-export-target');
        if (!element) {
          message.error('导出失败：未找到日历元素');
          return;
        }
        const weekLabel = dayjs(currentWeekStart || schedule?.dates?.[0]).format('YYYY-MM-DD');
        await exportAsImage(element, `calendar-${weekLabel}`);
        message.success('图片导出成功');
      } catch (e) {
        message.error('导出失败，请重试');
      } finally {
        setExporting(false);
      }
    },
  }), [readOnly, schedule, currentWeekStart, createForm]);

  // Mobile dimensions
  const TIME_AXIS_WIDTH = isMobile ? 36 : 48;
  const SUMMARY_HEIGHT = isMobile ? 100 : 120;
  const PX_PER_HOUR = isMobile ? 38 : 50;

  // Tick every minute to update future/normal transitions
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);
  const SCROLL_HOUR = 8;

  // Fetch tasks and persons
  useEffect(() => {
    api.getTasks().then(setTasks).catch(() => setTasks([]));
    api.getPersons().then(setPersons).catch(() => setPersons([]));
  }, []);

  // Build task color lookup map
  const taskColorMap: Record<string, string> = {};
  (Array.isArray(tasks) ? tasks : []).forEach(t => { if (t.color) taskColorMap[t.id] = t.color; });

  // Auto-scroll to 8am
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

  // Handle jumpToDate (from search result click)
  useEffect(() => {
    if (jumpToDate && onGoToWeek) {
      onGoToWeek(jumpToDate);
      onJumpComplete?.();
    }
  }, [jumpToDate, onGoToWeek, onJumpComplete]);

  // Filter to visible days (first N days of the week)
  const visibleDates = (schedule?.dates || []).slice(0, visibleDays);
  const today = localDateString(new Date());
  const todayIndex = visibleDates.indexOf(today);

  const weatherMap: Record<string, any> = {};
  (Array.isArray(weather) ? weather : []).forEach(w => { weatherMap[w.date] = w; });

  const dayNames = isMobile ? dayNamesShort : dayNamesFull;

  const initSummaryItems = (date: string) => {
    if (!(date in summaryItems)) {
      const summary = schedule?.summaries?.[date];
      summaryItems[date] = summary?.content ? summary.content.split('\n').filter(Boolean) : [];
      setSummaryItems(prev => ({ ...prev, [date]: [...summaryItems[date]] }));
    }
  };

  const openCreateModal = (date: string, time?: string) => {
    if (readOnly) return; // 禁止未登录用户创建
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

    // Validate end time is after start time
    if (endTime && endTime <= startTime) {
      message.error('结束时间必须在开始时间之后');
      return;
    }

    // Check for conflicts
    const conflictCheck = await api.getWeekSchedule();
    const eventsOnDate = (conflictCheck?.events || {})[values.date ? values.date.format('YYYY-MM-DD') : ''] || [];
    for (const ev of eventsOnDate) {
      const evEnd = ev.end_time || ev.start_time;
      if (startTime < evEnd && (endTime || startTime) > ev.start_time) {
        message.error(`时间冲突：与已有日程「${ev.title}」（${ev.start_time}-${evEnd}）重叠`);
        return;
      }
    }

    try {
      await onAddEvent?.({
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
    if (readOnly) return; // 禁止未登录用户编辑
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

    // Validate end time is after start time
    if (endTime && endTime <= startTime) {
      message.error('结束时间必须在开始时间之后');
      return;
    }

    // Check for conflicts (exclude current event)
    const dateVal = values.date ? values.date.format('YYYY-MM-DD') : editingEvent.date;
    const conflictCheck = await api.getWeekSchedule();
    const eventsOnDate = (conflictCheck?.events || {})[dateVal] || [];
    for (const ev of eventsOnDate) {
      if (ev.id === editingEvent.id) continue;
      const evEnd = ev.end_time || ev.start_time;
      if (startTime < evEnd && (endTime || startTime) > ev.start_time) {
        message.error(`时间冲突：与已有日程「${ev.title}」（${ev.start_time}-${evEnd}）重叠`);
        return;
      }
    }

    try {
      await onUpdateEvent?.(editingEvent.id, {
        date: dateVal,
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
    onUpdateSummary?.(date, updated.join('\n'));
  };

  const handleRemoveSummaryItem = (date: string, index: number) => {
    initSummaryItems(date);
    const updated = [...(summaryItems[date] || [])];
    updated.splice(index, 1);
    setSummaryItems(prev => ({ ...prev, [date]: updated }));
    onUpdateSummary?.(date, updated.join('\n'));
  };

  const handlePersonSelect = (value: string) => {
    if (!persons.includes(value)) {
      api.addPerson(value).then(() => setPersons(prev => [...prev, value])).catch(() => {});
    }
  };

  const totalDays = visibleDates.length;

  // Navigation bar - only for mobile or when not hidden
  const navBar = hideDesktopNav ? null : isMobile ? (
    <div style={{
      background: '#fff',
      borderBottom: '1px solid #e8e8e8',
      padding: '6px 12px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
      flexShrink: 0,
    }}>
      <Button size="small" style={{ background: '#f5f5f5', border: '1px solid #d9d9d9', width: 36, minWidth: 36, padding: 0, height: 28, borderRadius: 8 }} onClick={onPrevWeek}>
        <LeftOutlined style={{ fontSize: 10 }} />
      </Button>
      <Button size="small" type="primary" style={{ width: 56, minWidth: 56, padding: 0, height: 28, borderRadius: 8, fontWeight: 500, background: '#1890ff', border: 'none' }} onClick={onGoToToday}>
        今日
      </Button>
      <Button size="small" style={{ background: '#f5f5f5', border: '1px solid #d9d9d9', width: 36, minWidth: 36, padding: 0, height: 28, borderRadius: 8 }} onClick={onNextWeek}>
        <RightOutlined style={{ fontSize: 10 }} />
      </Button>
      <div style={{ flex: 1 }} />
      <Button size="small" icon={<DownloadOutlined />} style={{ borderRadius: 8, background: '#f5f5f5', border: '1px solid #d9d9d9', height: 28 }} loading={exporting} disabled />
      {!readOnly && (
        <Button size="small" type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8, background: '#52c41a', border: 'none' }} onClick={() => openCreateModal(todayIndex >= 0 ? visibleDates[todayIndex] : visibleDates[0])}>
          添加
        </Button>
      )}
    </div>
  ) : (
    // Desktop nav bar (when hideDesktopNav is false)
    <div style={{
      background: '#fff',
      borderBottom: '1px solid #e8e8e8',
      padding: '8px 12px',
      display: 'flex',
      justifyContent: 'flex-start',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
    }}>
      <Button size="small" icon={<LeftOutlined />} onClick={onPrevWeek}>上周</Button>
      <Button size="small" type="primary" onClick={onGoToToday}>今日</Button>
      <Button size="small" icon={<RightOutlined />} onClick={onNextWeek}>下周</Button>
      <div style={{ flex: 1 }} />
      <Button size="small" icon={<DownloadOutlined />} loading={exporting} disabled>导出</Button>
      {!readOnly && (
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openCreateModal(todayIndex >= 0 ? visibleDates[todayIndex] : visibleDates[0])}>添加日程</Button>
      )}
    </div>
  );

  return (
    <div id="calendar-export-target" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', position: isMobile ? 'relative' : undefined }}>

      {navBar}

      {weatherLoading || loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* Header Row */}
          <HeaderRow
            dates={visibleDates}
            today={today}
            weatherMap={weatherMap}
            timeAxisWidth={TIME_AXIS_WIDTH}
            dayNames={dayNames}
            isMobile={isMobile}
          />

          {/* Calendar area */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div ref={calendarRef} style={{ display: 'flex', flex: 1, overflow: 'auto', minHeight: 0 }}>
              {/* Time axis */}
              <TimeAxis totalHours={24} pxPerHour={PX_PER_HOUR} timeAxisWidth={TIME_AXIS_WIDTH} />

              {/* Day columns */}
              <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                {visibleDates.map((date, idx) => {
                  const events = schedule?.events?.[date] || [];
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
                      isLastDay={idx === totalDays - 1}
                      totalHours={24}
                      pxPerHour={PX_PER_HOUR}
                      onDelete={(id) => { onRemoveEvent?.(id); }}
                      onEdit={openEditModal}
                      onDoubleClick={(timeStr) => openCreateModal(date, timeStr)}
                      isMobile={isMobile}
                      taskColorMap={taskColorMap}
                      tasks={tasks}
                    />
                  );
                })}
              </div>
            </div>

            {/* Daily Summaries Row */}
            <div style={{ display: 'flex', borderTop: '1px solid #f0f0f0', background: '#fafbfc', flexShrink: 0, maxHeight: 4 * 22 }}>
              <div style={{ width: TIME_AXIS_WIDTH, flexShrink: 0, background: '#fafbfc', borderRight: '1px solid #f0f0f0' }} />
              {visibleDates.map((date, idx) => {
                initSummaryItems(date);
                const items = summaryItems[date] || [];
                const isFutureDate = date > today;
                return (
                  <div key={date} style={{ flex: 1, borderRight: idx < totalDays - 1 ? '1px solid #f0f0f0' : 'none', padding: '2px 6px', overflowY: 'auto' }}>
                    {isFutureDate ? null : items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, fontSize: 12 }}>
                        <span style={{ color: '#1890ff', fontSize: 10 }}>•</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item}</span>
                        <Popconfirm title="确认删除？" onConfirm={() => handleRemoveSummaryItem(date, i)}>
                          <Button size="small" type="text" style={{ padding: 0, height: 'auto', fontSize: 12, color: '#ccc' }}>×</Button>
                        </Popconfirm>
                      </div>
                    ))}
                    {isFutureDate ? null : (
                      <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                        <Input size="small" placeholder="添加..." value={newSummaryItem[date] || ''} onChange={(e) => setNewSummaryItem(prev => ({ ...prev, [date]: e.target.value }))} onPressEnter={() => handleAddSummaryItem(date)} style={{ fontSize: 12, flex: 1 }} />
                        <Button size="small" type="link" style={{ padding: 0, height: 'auto', fontSize: 12 }} onClick={() => handleAddSummaryItem(date)}>+</Button>
                      </div>
                    )}
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
          <Form.Item name="title" label="工作内容" rules={[{ required: true, message: '请输入工作内容' }]}>
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
              {(Array.isArray(tasks) ? tasks : []).map(t => <Select.Option key={t.id} value={t.id}>{t.project_name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="assigned_team" label="负责人">
            <Select allowClear placeholder="输入或选择负责人" showSearch mode="tags" maxCount={1} onSelect={handlePersonSelect}>
              {(Array.isArray(persons) ? persons : []).map(p => <Select.Option key={p} value={p}>{p}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="location" label="地点">
            <Input placeholder="施工地点（可选）" />
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
          <Form.Item name="title" label="工作内容" rules={[{ required: true, message: '请输入工作内容' }]}>
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
              {(Array.isArray(tasks) ? tasks : []).map(t => <Select.Option key={t.id} value={t.id}>{t.project_name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="assigned_team" label="负责人">
            <Select allowClear placeholder="输入或选择负责人" showSearch mode="tags" maxCount={1} onSelect={handlePersonSelect}>
              {(Array.isArray(persons) ? persons : []).map(p => <Select.Option key={p} value={p}>{p}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="location" label="地点">
            <Input placeholder="施工地点（可选）" />
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
});

/** Header row */
function HeaderRow({ dates, today, weatherMap, timeAxisWidth, dayNames, isMobile }: {
  dates: string[];
  today: string;
  weatherMap: Record<string, any>;
  timeAxisWidth: number;
  dayNames: string[];
  isMobile: boolean;
}) {
  return (
    <div style={{ display: 'flex', borderBottom: '2px solid #e8e8e8', background: '#fafbfc', flexShrink: 0 }}>
      <div style={{ width: timeAxisWidth, flexShrink: 0, background: '#fafbfc' }} />
      {dates.map((date, idx) => (
        <div key={date} style={{ flex: 1, borderRight: idx < dates.length - 1 ? '1px solid #e8e8e8' : 'none' }}>
          <div style={{ fontWeight: 600, fontSize: isMobile ? 12 : 14, textAlign: 'center', padding: isMobile ? '4px 0' : '6px 0', color: date === today ? '#1890ff' : '#1a1a2e' }}>
            {dayNames[idx]} <span style={{ color: '#999', fontWeight: 400, fontSize: isMobile ? 10 : 12 }}>{formatDateShort(date)}</span>
            {date === today && <span style={{ color: '#ff4d4f', fontSize: isMobile ? 9 : 11 }}> 今天</span>}
          </div>
          {!isMobile && weatherMap[date] ? <WeatherCard weather={weatherMap[date]} /> : null}
          {isMobile && weatherMap[date] ? (
            <div style={{ fontSize: 9, color: '#888', textAlign: 'center', padding: '1px 0' }}>
              {weatherMap[date].description} {weatherMap[date].tempMin}°/{weatherMap[date].tempMax}°
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function TimeAxis({ totalHours, pxPerHour, timeAxisWidth }: { totalHours: number; pxPerHour: number; timeAxisWidth: number }) {
  return (
    <div style={{ width: timeAxisWidth, flexShrink: 0, background: '#fafbfc', borderRight: '1px solid #e8e8e8', position: 'relative' }}>
      {Array.from({ length: totalHours }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: i * pxPerHour,
            left: 0,
            right: 0,
            fontSize: 8,
            color: '#bbb',
            textAlign: 'right',
            paddingRight: 4,
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

function WeekDayColumn({ date, events, isRainy, isToday, isLastDay, pxPerHour, totalHours, onDelete, onEdit, onDoubleClick, isMobile, taskColorMap, tasks }: {
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
  isMobile: boolean;
  taskColorMap: Record<string, string>;
  tasks: Task[];
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
        <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 8, padding: '4px 8px', marginBottom: 4, fontSize: isMobile ? 9 : 10, color: '#ff4d4f', fontWeight: 500 }}>
          雨天户外作业提醒
        </div>
      )}
      {/* Future time overlay - today's future hours */}
      {isToday && (() => {
        const now = new Date();
        const currentHour = now.getHours() + now.getMinutes() / 60;
        return (
          <div style={{
            position: 'absolute',
            left: 0, right: 0,
            top: currentHour * pxPerHour,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.10)',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
        );
      })()}
      {/* Future date overlay - full column dark */}
      {!isToday && date > localDateString(new Date()) && (
        <div style={{
          position: 'absolute',
          left: 0, right: 0, top: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.06)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />
      )}
      {events.map(event => {
        const [startH, startM] = event.start_time.split(':').map(Number);
        const [endH, endM] = event.end_time.split(':').map(Number);
        const startVal = startH + startM / 60;
        const endVal = endH + endM / 60;
        const topPx = startVal * pxPerHour;
        const heightPx = Math.max(28, (endVal - startVal) * pxPerHour);

        const now = new Date();
        const currentHour = now.getHours() + now.getMinutes() / 60;
        const todayLocal = localDateString(now);
        const isFuture = date > todayLocal || (date === todayLocal && startVal > currentHour);

        return (
          <div
            key={event.id}
            data-event-id={event.id}
            style={{
              position: 'absolute',
              left: isMobile ? 2 : 4,
              right: isMobile ? 2 : 4,
              top: topPx,
              height: heightPx,
              zIndex: 5,
            }}
          >
            <EventCard event={event} onDelete={onDelete} onEdit={onEdit} isMobile={isMobile} taskColor={event.task_id ? taskColorMap[event.task_id] : undefined} tasks={tasks} isFuture={isFuture} />
          </div>
        );
      })}
    </div>
  );
}



