import { Router, Request, Response } from 'express';
import { getDb } from '../db/init';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

const JWT_SECRET: string = process.env.JWT_SECRET || 'dev-secret-change-me';
const SALT_ROUNDS = 12;

const router = Router();

// POST /api/auth/register
router.post('/register', validate({
  body: {
    username: { required: true, minLength: 3, maxLength: 30, pattern: /^[a-zA-Z0-9]+$/ },
    password: { required: true, minLength: 6 },
  }
}), async (req: Request, res: Response) => {
  const { username, password, display_name } = req.body;

  // Validation (existing manual checks preserved)
  if (!username || !password) {
    return res.status(400).json({ error: 'BadRequest', message: 'Username and password are required' });
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'BadRequest', message: 'Username and password must be strings' });
  }

  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ error: 'BadRequest', message: 'Username must be between 3 and 30 characters' });
  }

  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    return res.status(400).json({ error: 'BadRequest', message: 'Username must be alphanumeric' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'BadRequest', message: 'Password must be at least 6 characters' });
  }

  const db = getDb();

  // Check if username already exists
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Conflict', message: 'Username already exists' });
  }

  // Hash password and insert user
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = randomUUID();
  const now = new Date().toISOString();
  const displayName = display_name || '';

  const result = db.prepare(
    'INSERT INTO users (id, username, password_hash, display_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, username, password_hash, displayName, 'user', now, now);

  if (result.changes === 0) {
    return res.status(500).json({ error: 'InternalError', message: 'Failed to create user' });
  }

  res.status(201).json({
    id,
    username,
    display_name: displayName,
    role: 'user',
    created_at: now,
  });
});

// POST /api/auth/login
router.post('/login', validate({
  body: {
    username: { required: true },
    password: { required: true },
  }
}), async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'BadRequest', message: 'Username and password are required' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as
    | { id: string; username: string; password_hash: string; display_name: string; role: string }
    | undefined;

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
    },
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const user = db.prepare(
    'SELECT id, username, display_name, role, created_at FROM users WHERE id = ?'
  ).get(req.userId) as
    | { id: string; username: string; display_name: string; role: string; created_at: string }
    | undefined;

  if (!user) {
    return res.status(404).json({ error: 'NotFound', message: 'User not found' });
  }

  res.json(user);
});

export default router;
