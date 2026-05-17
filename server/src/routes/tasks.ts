import { Router, Request, Response } from 'express';
import { getDb } from '../db/init';

function generateColor(seed: string): string {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
    '#e11d48', '#7c3aed', '#0ea5e9', '#84cc16', '#d946ef',
    '#f43f5e', '#22d3ee', '#a855f7', '#22c55e', '#eab308',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) { hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0; }
  return colors[Math.abs(hash) % colors.length];
}

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const status = _req.query.status as string | undefined;
  const stmt = status
    ? db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC')
    : db.prepare('SELECT * FROM tasks ORDER BY created_at DESC');
  const tasks = status ? stmt.all(status) : stmt.all();
  res.json(tasks);
});

router.get('/:id', (_req: Request, res: Response) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(_req.params.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  res.json(task);
});

router.post('/', (_req: Request, res: Response) => {
  const db = getDb();
  const { project_name, location, assigned_team, status, progress, planned_start_date, deadline, notes, color } = _req.body;
  const now = new Date().toISOString();
  const id = `task-${Date.now()}`;
  const taskColor = color || generateColor(project_name);
  const result = db.prepare(
    'INSERT INTO tasks (id, project_name, location, assigned_team, status, progress, planned_start_date, deadline, notes, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, project_name, location, assigned_team || null, status || 'entrusted', progress || 0, planned_start_date || null, deadline || null, notes || '', taskColor, now, now);
  if (result.changes === 0) return res.status(500).json({ error: '创建任务失败' });
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.status(201).json(task);
});

router.put('/:id', (_req: Request, res: Response) => {
  const db = getDb();
  const { project_name, location, assigned_team, status, progress, planned_start_date, deadline, notes, color } = _req.body;
  const now = new Date().toISOString();
  const result = db.prepare(
    'UPDATE tasks SET project_name = COALESCE(?, project_name), location = COALESCE(?, location), assigned_team = COALESCE(?, assigned_team), status = COALESCE(?, status), progress = COALESCE(?, progress), planned_start_date = COALESCE(?, planned_start_date), deadline = COALESCE(?, deadline), notes = COALESCE(?, notes), color = COALESCE(?, color), updated_at = ? WHERE id = ?'
  ).run(project_name, location, assigned_team, status, progress, planned_start_date, deadline, notes, color, now, _req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '任务不存在' });
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(_req.params.id);
  res.json(task);
});

router.put('/:id/status', (_req: Request, res: Response) => {
  const db = getDb();
  const { status } = _req.body;
  const validStatuses = ['entrusted', 'in_progress', 'reporting', 'completed'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: '状态无效' });
  const now = new Date().toISOString();
  const result = db.prepare(
    'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?'
  ).run(status, now, _req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '任务不存在' });
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(_req.params.id);
  res.json(task);
});

router.delete('/:id', (_req: Request, res: Response) => {
  const db = getDb();
  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(_req.params.id);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  db.prepare('DELETE FROM schedule_events WHERE task_id = ?').run(_req.params.id);
  db.prepare('DELETE FROM tasks WHERE id = ?').run(_req.params.id);
  res.json({ success: true });
});

export default router;
