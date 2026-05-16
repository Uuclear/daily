import { Router, Request, Response } from 'express';
import { getDb } from '../db/init';

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
  const { project_name, location, assigned_team, status, progress, planned_start_date, deadline, notes } = _req.body;
  const now = new Date().toISOString();
  const id = `task-${Date.now()}`;
  const result = db.prepare(
    'INSERT INTO tasks (id, project_name, location, assigned_team, status, progress, planned_start_date, deadline, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, project_name, location, assigned_team || null, status || 'entrusted', progress || 0, planned_start_date || null, deadline || null, notes || '', now, now);
  if (result.changes === 0) return res.status(500).json({ error: '创建任务失败' });
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.status(201).json(task);
});

router.put('/:id', (_req: Request, res: Response) => {
  const db = getDb();
  const { project_name, location, assigned_team, status, progress, planned_start_date, deadline, notes } = _req.body;
  const now = new Date().toISOString();
  const result = db.prepare(
    'UPDATE tasks SET project_name = COALESCE(?, project_name), location = COALESCE(?, location), assigned_team = COALESCE(?, assigned_team), status = COALESCE(?, status), progress = COALESCE(?, progress), planned_start_date = COALESCE(?, planned_start_date), deadline = COALESCE(?, deadline), notes = COALESCE(?, notes), updated_at = ? WHERE id = ?'
  ).run(project_name, location, assigned_team, status, progress, planned_start_date, deadline, notes, now, _req.params.id);
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
