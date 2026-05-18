import { Router, Request, Response } from 'express';
import { getDb } from '../db/init';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Default notification settings
const defaultSettings = {
  enabled: 1,
  reminder_days: 1,
  reminder_time: '08:00',
  notify_on_deadline: 1,
  notify_on_schedule: 1,
};

// GET /api/notifications/settings
router.get('/settings', (_req: Request, res: Response) => {
  const db = getDb();
  const userId = _req.userId;

  const settings = db.prepare(
    'SELECT * FROM notification_settings WHERE user_id = ?'
  ).get(userId);

  if (!settings) {
    // Return defaults with user context
    return res.json({
      id: `notif-${Date.now()}`,
      user_id: userId,
      ...defaultSettings,
    });
  }

  res.json(settings);
});

// PUT /api/notifications/settings
router.put('/settings', (_req: Request, res: Response) => {
  const db = getDb();
  const userId = _req.userId;
  const {
    enabled,
    reminder_days,
    reminder_time,
    notify_on_deadline,
    notify_on_schedule,
  } = _req.body;

  const now = new Date().toISOString();
  const id = `notif-${Date.now()}`;

  // Upsert: insert or update
  db.prepare(
    `INSERT INTO notification_settings
      (id, user_id, enabled, reminder_days, reminder_time, notify_on_deadline, notify_on_schedule, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       enabled = COALESCE(excluded.enabled, notification_settings.enabled),
       reminder_days = COALESCE(excluded.reminder_days, notification_settings.reminder_days),
       reminder_time = COALESCE(excluded.reminder_time, notification_settings.reminder_time),
       notify_on_deadline = COALESCE(excluded.notify_on_deadline, notification_settings.notify_on_deadline),
       notify_on_schedule = COALESCE(excluded.notify_on_schedule, notification_settings.notify_on_schedule),
       updated_at = ?
     WHERE user_id = ?`
  ).run(
    id,
    userId,
    enabled ?? defaultSettings.enabled,
    reminder_days ?? defaultSettings.reminder_days,
    reminder_time ?? defaultSettings.reminder_time,
    notify_on_deadline ?? defaultSettings.notify_on_deadline,
    notify_on_schedule ?? defaultSettings.notify_on_schedule,
    now,
    now,
    userId
  );

  const updated = db.prepare(
    'SELECT * FROM notification_settings WHERE user_id = ?'
  ).get(userId);

  res.json(updated);
});

// GET /api/notifications/upcoming
router.get('/upcoming', (_req: Request, res: Response) => {
  const db = getDb();
  const userId = _req.userId;

  // Get user's reminder_days setting (default to 1)
  const settings = db.prepare(
    'SELECT reminder_days, notify_on_deadline, notify_on_schedule FROM notification_settings WHERE user_id = ?'
  ).get(userId) as { reminder_days: number; notify_on_deadline: number; notify_on_schedule: number } | undefined;

  const reminderDays = settings?.reminder_days ?? defaultSettings.reminder_days;
  const notifyOnDeadline = settings?.notify_on_deadline ?? defaultSettings.notify_on_deadline;
  const notifyOnSchedule = settings?.notify_on_schedule ?? defaultSettings.notify_on_schedule;

  const upcomingTasks: any[] = [];
  const upcomingEvents: any[] = [];

  if (notifyOnDeadline) {
    // Tasks with deadlines within reminder_days from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future = new Date(today);
    future.setDate(future.getDate() + reminderDays);

    const todayStr = today.toISOString().split('T')[0];
    const futureStr = future.toISOString().split('T')[0];

    const tasks = db.prepare(
      `SELECT * FROM tasks
       WHERE deadline IS NOT NULL
         AND deadline >= ? AND deadline <= ?
         AND (user_id = ? OR user_id = 'system')
       ORDER BY deadline ASC`
    ).all(todayStr, futureStr, userId);

    upcomingTasks.push(...tasks);
  }

  if (notifyOnSchedule) {
    // Schedule events within reminder_days from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future = new Date(today);
    future.setDate(future.getDate() + reminderDays);

    const todayStr = today.toISOString().split('T')[0];
    const futureStr = future.toISOString().split('T')[0];

    const events = db.prepare(
      `SELECT * FROM schedule_events
       WHERE date IS NOT NULL
         AND date >= ? AND date <= ?
         AND (user_id = ? OR user_id = 'system')
       ORDER BY date ASC, start_time ASC`
    ).all(todayStr, futureStr, userId);

    upcomingEvents.push(...events);
  }

  res.json({
    tasks: upcomingTasks,
    events: upcomingEvents,
  });
});

export default router;
