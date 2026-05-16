import { Router, Request, Response } from 'express';
import { getDb } from '../db/init';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const persons = db.prepare('SELECT * FROM persons ORDER BY name').all();
  res.json(persons);
});

router.post('/', (_req: Request, res: Response) => {
  const db = getDb();
  const { name } = _req.body;
  if (!name) return res.status(400).json({ error: '名称不能为空' });
  const id = `person-${Date.now()}`;
  try {
    db.prepare('INSERT INTO persons (id, name) VALUES (?, ?)').run(id, name);
    res.status(201).json({ id, name });
  } catch {
    // Already exists, return existing
    const existing = db.prepare('SELECT * FROM persons WHERE name = ?').get(name);
    res.json(existing);
  }
});

export default router;
