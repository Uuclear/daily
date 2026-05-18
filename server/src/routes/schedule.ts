import { Router, Request, Response } from 'express';
import { getDb } from '../db/init';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

function getWeekDates(dateStr?: string): string[] {
  const date = dateStr ? new Date(dateStr) : new Date();
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1));

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const userId = _req.userId;
  const { week, date } = _req.query as { week?: string; date?: string };
  const dates = getWeekDates(date || week);

  const stmt = db.prepare('SELECT * FROM schedule_events WHERE date = ? AND (user_id = ? OR user_id = \'system\') ORDER BY start_time');
  const events: Record<string, any[]> = {};
  dates.forEach(d => {
    events[d] = stmt.all(d, userId);
  });

  // Get daily summaries
  const summaryStmt = db.prepare('SELECT * FROM daily_summaries WHERE date = ? AND (user_id = ? OR user_id = \'system\')');
  const summaries: Record<string, any> = {};
  dates.forEach(d => {
    const s = summaryStmt.get(d, userId);
    if (s) summaries[d] = s;
  });

  res.json({ dates, events, summaries });
});

router.post('/', (_req: Request, res: Response) => {
  const db = getDb();
  const userId = _req.userId;
  const { task_id, date, start_time, end_time, title, work_content, is_milestone, assigned_team, location, notes } = _req.body;

  // Validate time format
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timeRegex.test(start_time)) {
    return res.status(400).json({ error: '开始时间格式无效，应为 HH:MM（00:00-23:59）' });
  }
  if (end_time && !timeRegex.test(end_time)) {
    return res.status(400).json({ error: '结束时间格式无效，应为 HH:MM（00:00-23:59）' });
  }

  const actualEnd = end_time || start_time;

  // Check for overlapping events on the same date (only user's events)
  const existing = db.prepare(
    'SELECT id, start_time, end_time, title FROM schedule_events WHERE date = ? AND (user_id = ? OR user_id = \'system\')'
  ).all(date, userId) as { id: string; start_time: string; end_time: string; title: string }[];

  for (const ev of existing) {
    const evEnd = ev.end_time || ev.start_time;
    // Overlap: newStart < existingEnd AND newEnd > existingStart
    if (start_time < evEnd && actualEnd > ev.start_time) {
      return res.status(409).json({
        error: `时间冲突：与已有日程"${ev.title}"（${ev.start_time}-${evEnd}）重叠`,
        conflict: true,
        conflictEvent: ev,
      });
    }
  }

  const id = `event-${Date.now()}`;
  const result = db.prepare(
    'INSERT INTO schedule_events (id, task_id, date, start_time, end_time, title, work_content, is_milestone, assigned_team, location, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, task_id || null, date, start_time, actualEnd, title, work_content || '', is_milestone ? 1 : 0, assigned_team || null, location || '', notes || '', userId);
  if (result.changes === 0) return res.status(500).json({ error: '创建日程失败' });
  const event = db.prepare('SELECT * FROM schedule_events WHERE id = ?').get(id);
  res.status(201).json(event);
});

router.put('/:id', (_req: Request, res: Response) => {
  const db = getDb();
  const { task_id, date, start_time, end_time, title, work_content, is_milestone, assigned_team, location, notes } = _req.body;

  // Validate time format if provided
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  const newStart = start_time || null;
  const newEnd = end_time || null;
  if (newStart && !timeRegex.test(newStart)) {
    return res.status(400).json({ error: '开始时间格式无效，应为 HH:MM（00:00-23:59）' });
  }
  if (newEnd && !timeRegex.test(newEnd)) {
    return res.status(400).json({ error: '结束时间格式无效，应为 HH:MM（00:00-23:59）' });
  }

  // Check for overlapping events if date/time changed
  const checkDate = date || null;
  if (checkDate && newStart) {
    const actualEnd = newEnd || newStart;
    const existing = db.prepare(
      'SELECT id, start_time, end_time, title FROM schedule_events WHERE date = ? AND (user_id = ? OR user_id = \'system\')'
    ).all(checkDate, _req.userId) as { id: string; start_time: string; end_time: string; title: string }[];

    for (const ev of existing) {
      if (ev.id === _req.params.id) continue; // skip self
      const evEnd = ev.end_time || ev.start_time;
      if (newStart < evEnd && actualEnd > ev.start_time) {
        return res.status(409).json({
          error: `时间冲突：与已有日程"${ev.title}"（${ev.start_time}-${evEnd}）重叠`,
          conflict: true,
        });
      }
    }
  }

  const result = db.prepare(
    'UPDATE schedule_events SET task_id = COALESCE(?, task_id), date = COALESCE(?, date), start_time = COALESCE(?, start_time), end_time = COALESCE(?, end_time), title = COALESCE(?, title), work_content = COALESCE(?, work_content), is_milestone = COALESCE(?, is_milestone), assigned_team = COALESCE(?, assigned_team), location = COALESCE(?, location), notes = COALESCE(?, notes) WHERE id = ? AND (user_id = ? OR user_id = \'system\')'
  ).run(task_id, date, start_time, end_time, title, work_content, is_milestone !== undefined ? (is_milestone ? 1 : 0) : undefined, assigned_team, location, notes, _req.params.id, _req.userId);
  if (result.changes === 0) return res.status(404).json({ error: '日程不存在' });
  const event = db.prepare('SELECT * FROM schedule_events WHERE id = ?').get(_req.params.id);
  res.json(event);
});

router.delete('/:id', (_req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM schedule_events WHERE id = ? AND (user_id = ? OR user_id = \'system\')').run(_req.params.id, _req.userId);
  if (result.changes === 0) return res.status(404).json({ error: '日程不存在' });
  res.json({ success: true });
});

// Check time conflict without creating
router.post('/check-conflict', (_req: Request, res: Response) => {
  const db = getDb();
  const { date, start_time, end_time, exclude_id } = _req.body;

  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timeRegex.test(start_time)) {
    return res.status(400).json({ error: '开始时间格式无效' });
  }
  const actualEnd = end_time || start_time;

  const existing = db.prepare(
    'SELECT id, start_time, end_time, title FROM schedule_events WHERE date = ? AND (user_id = ? OR user_id = \'system\')'
  ).all(date, _req.userId) as { id: string; start_time: string; end_time: string; title: string }[];

  for (const ev of existing) {
    if (exclude_id && ev.id === exclude_id) continue;
    const evEnd = ev.end_time || ev.start_time;
    if (start_time < evEnd && actualEnd > ev.start_time) {
      return res.json({ conflict: true, message: `时间冲突：与已有日程"${ev.title}"（${ev.start_time}-${evEnd}）重叠` });
    }
  }

  res.json({ conflict: false });
});

// Daily summaries
router.post('/summary', (_req: Request, res: Response) => {
  const db = getDb();
  const userId = _req.userId;
  const { date, content } = _req.body;
  const now = new Date().toISOString();
  const id = `sum-${Date.now()}`;
  db.prepare(
    'INSERT INTO daily_summaries (id, date, content, updated_at, user_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT(date) DO UPDATE SET content = ?, updated_at = ?'
  ).run(id, date, content || '', now, userId, content || '', now);
  const summary = db.prepare('SELECT * FROM daily_summaries WHERE date = ? AND (user_id = ? OR user_id = \'system\')').get(date, userId);
  res.json(summary);
});

export default router;
