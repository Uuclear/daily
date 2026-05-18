import { useState, useEffect, useCallback } from 'react';
import {
  Badge,
  Popover,
  Modal,
  Switch,
  InputNumber,
  TimePicker,
  Checkbox,
  Button,
  List,
  Typography,
  Space,
  message,
  Divider,
} from 'antd';
import {
  BellOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getNotificationSettings,
  updateNotificationSettings,
  getUpcomingNotifications,
  type NotificationSettings,
  type UpcomingNotification,
} from './api/client';

const { Text } = Typography;

// Default settings shape
const defaultSettings: NotificationSettings = {
  enabled: true,
  reminder_days: 3,
  reminder_time: '08:00',
  notify_on_deadline: true,
  notify_on_schedule: true,
};

/**
 * Request browser Notification permission.
 * Returns 'granted' | 'denied' | 'default'.
 */
async function requestBrowserNotification(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    message.warning('当前浏览器不支持通知功能');
    return 'denied';
  }
  if (Notification.permission === 'granted') return 'granted';
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    new Notification('通知已启用', { body: '您将在截止时间前收到提醒' });
  }
  return permission;
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [upcoming, setUpcoming] = useState<UpcomingNotification>({ tasks: [], events: [] });
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(false);

  const totalCount = upcoming.tasks.length + upcoming.events.length;

  // Load upcoming notifications
  const fetchUpcoming = useCallback(async () => {
    try {
      const data = await getUpcomingNotifications();
      setUpcoming(data);
    } catch {
      // Silently ignore — API may not be implemented yet
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await getNotificationSettings();
        if (mounted) setSettings(s);
      } catch {
        // Use defaults
      }
    })();
    fetchUpcoming();
    return () => { mounted = false; };
  }, [fetchUpcoming]);

  // Poll every 60 seconds
  useEffect(() => {
    const timer = setInterval(fetchUpcoming, 60_000);
    return () => clearInterval(timer);
  }, [fetchUpcoming]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const updated = await updateNotificationSettings(settings);
      setSettings(updated);
      message.success('通知设置已保存');
      setSettingsOpen(false);
    } catch {
      message.error('保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleEnableBrowserNotif = async () => {
    const result = await requestBrowserNotification();
    if (result === 'granted') {
      setBrowserNotifEnabled(true);
      message.success('浏览器通知已启用');
    }
  };

  const popoverContent = (
    <div style={{ minWidth: 280, maxWidth: 360 }}>
      {/* Upcoming Tasks */}
      <Text strong style={{ fontSize: 14 }}>
        <ClockCircleOutlined style={{ marginRight: 4, color: '#1677ff' }} />
        即将到期任务
      </Text>
      {upcoming.tasks.length === 0 ? (
        <Text type="secondary" style={{ display: 'block', margin: '8px 0' }}>
          暂无即将到期任务
        </Text>
      ) : (
        <List
          size="small"
          dataSource={upcoming.tasks}
          renderItem={(item: any) => (
            <List.Item>
              <List.Item.Meta
                title={<Text ellipsis>{item.project_name || item.title}</Text>}
                description={
                  <Space size={4}>
                    <Text type="danger">{item.deadline}</Text>
                    {item.assigned_team && <Text type="secondary">{item.assigned_team}</Text>}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}

      <Divider style={{ margin: '12px 0' }} />

      {/* Upcoming Events */}
      <Text strong style={{ fontSize: 14 }}>
        <CalendarOutlined style={{ marginRight: 4, color: '#52c41a' }} />
        即将到期日程
      </Text>
      {upcoming.events.length === 0 ? (
        <Text type="secondary" style={{ display: 'block', margin: '8px 0' }}>
          暂无即将到期日程
        </Text>
      ) : (
        <List
          size="small"
          dataSource={upcoming.events}
          renderItem={(item: any) => (
            <List.Item>
              <List.Item.Meta
                title={<Text ellipsis>{item.title}</Text>}
                description={
                  <Space size={4}>
                    <Text type="secondary">{item.date}</Text>
                    <Text type="secondary">
                      {item.start_time}–{item.end_time}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}

      <Divider style={{ margin: '12px 0' }} />

      {/* Settings button */}
      <Button
        type="link"
        icon={<SettingOutlined />}
        onClick={() => {
          setOpen(false);
          setSettingsOpen(true);
        }}
        block
      >
        通知设置
      </Button>
    </div>
  );

  return (
    <>
      <Popover
        content={popoverContent}
        title="通知中心"
        trigger="click"
        open={open}
        onOpenChange={setOpen}
        placement="bottomRight"
      >
        <Badge count={totalCount} offset={[4, 0]}>
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 18 }} />}
            size="large"
            loading={loading}
          />
        </Badge>
      </Popover>

      {/* Settings Modal */}
      <Modal
        title="通知设置"
        open={settingsOpen}
        onCancel={() => setSettingsOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setSettingsOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleSaveSettings} loading={saving}>
              保存
            </Button>
          </Space>
        }
        width={420}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Enable notifications */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>启用通知</Text>
            <Switch
              checked={settings.enabled}
              onChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
            />
          </div>

          {/* Reminder days */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>提前提醒天数</Text>
            <InputNumber
              min={1}
              max={7}
              value={settings.reminder_days}
              onChange={(v) =>
                setSettings((s) => ({ ...s, reminder_days: v ?? defaultSettings.reminder_days }))
              }
              disabled={!settings.enabled}
            />
          </div>

          {/* Reminder time */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>提醒时间</Text>
            <TimePicker
              format="HH:mm"
              value={dayjs(settings.reminder_time, 'HH:mm')}
              onChange={(d) =>
                setSettings((s) => ({
                  ...s,
                  reminder_time: d ? d.format('HH:mm') : s.reminder_time,
                }))
              }
              disabled={!settings.enabled}
            />
          </div>

          {/* Deadline reminders */}
          <Checkbox
            checked={settings.notify_on_deadline}
            onChange={(e) =>
              setSettings((s) => ({ ...s, notify_on_deadline: e.target.checked }))
            }
            disabled={!settings.enabled}
          >
            截止时间提醒
          </Checkbox>

          {/* Schedule reminders */}
          <Checkbox
            checked={settings.notify_on_schedule}
            onChange={(e) =>
              setSettings((s) => ({ ...s, notify_on_schedule: e.target.checked }))
            }
            disabled={!settings.enabled}
          >
            日程提醒
          </Checkbox>

          <Divider style={{ margin: '8px 0' }} />

          {/* Browser notifications */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>浏览器通知</Text>
            <Button
              size="small"
              type={browserNotifEnabled ? 'default' : 'primary'}
              onClick={handleEnableBrowserNotif}
              disabled={browserNotifEnabled}
            >
              {browserNotifEnabled ? '已启用' : '启用'}
            </Button>
          </div>
        </Space>
      </Modal>
    </>
  );
}
