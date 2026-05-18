import { Router, Request, Response } from 'express';
import { getDb } from '../db/init';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const teams = db.prepare('SELECT * FROM teams WHERE (user_id = ? OR user_id = \'system\') ORDER BY name').all(_req.userId);
  // Parse members JSON array
  teams.forEach((team: any) => {
    try { team.members = JSON.parse(team.members); } catch { team.members = []; }
  });
  res.json(teams);
});

router.post('/', (_req: Request, res: Response) => {
  const db = getDb();
  const { name, color, members } = _req.body;
  const id = `team-${Date.now()}`;
  const membersJson = JSON.stringify(members || []);
  const result = db.prepare('INSERT INTO teams (id, name, color, members, user_id) VALUES (?, ?, ?, ?, ?)').run(id, name, color || '#1890ff', membersJson, _req.userId);
  if (result.changes === 0) return res.status(500).json({ error: 'Failed to create team' });
  res.status(201).json({ id, name, color: color || '#1890ff', members: members || [] });
});

router.put('/:id', (_req: Request, res: Response) => {
  const db = getDb();
  const { name, color, members } = _req.body;
  const membersJson = members ? JSON.stringify(members) : undefined;
  const result = db.prepare(
    'UPDATE teams SET name = COALESCE(?, name), color = COALESCE(?, color), members = COALESCE(?, members) WHERE id = ? AND (user_id = ? OR user_id = \'system\')'
  ).run(name, color, membersJson, _req.params.id, _req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Team not found' });
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(_req.params.id);
  try { (team as any).members = JSON.parse((team as any).members); } catch { (team as any).members = []; }
  res.json(team);
});

router.delete('/:id', (_req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM teams WHERE id = ? AND (user_id = ? OR user_id = \'system\')').run(_req.params.id, _req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Team not found' });
  res.json({ success: true });
});

export default router;
