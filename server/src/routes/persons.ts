import { Router, Request, Response } from 'express';
import { getDb } from '../db/init';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// GET - 公开访问
router.get('/', optionalAuth, (_req: Request, res: Response) => {
  const db = getDb();
  const userId = _req.userId || 'system';
  const persons = db.prepare('SELECT * FROM persons WHERE (user_id = ? OR user_id = \'system\') ORDER BY name').all(userId);
  res.json(persons);
});

// POST - 需要登录
router.post('/', authenticate, (_req: Request, res: Response) => {
  const db = getDb();
  const { name } = _req.body;
  if (!name) return res.status(400).json({ error: 'BadRequest', message: '名称不能为空' });
  const id = `person-${Date.now()}`;
  try {
    db.prepare('INSERT INTO persons (id, name, user_id) VALUES (?, ?, ?)').run(id, name, _req.userId);
    res.status(201).json({ id, name });
  } catch {
    // Already exists, return existing
    const existing = db.prepare('SELECT * FROM persons WHERE name = ? AND (user_id = ? OR user_id = \'system\')').get(name, _req.userId);
    res.json(existing);
  }
});

export default router;
