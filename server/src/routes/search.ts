import { Router, Request, Response } from 'express';
import { getDb } from '../db/init';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', validate({
  query: {
    q: { required: true },
  }
}), (req: Request, res: Response) => {
  const { q } = req.query;
  const keyword = String(q || '').trim();

  if (!keyword) {
    return res.status(400).json({ error: 'BadRequest', message: 'Search keyword required' });
  }

  const db = getDb();
  const userId = req.userId;
  const likePattern = `%${keyword}%`;

  // Search tasks
  const tasks = db.prepare(`
    SELECT id, project_name, location, status, progress, notes, assigned_team, deadline,
           CASE
             WHEN project_name LIKE ? THEN 'project_name'
             WHEN location LIKE ? THEN 'location'
             WHEN notes LIKE ? THEN 'notes'
             WHEN assigned_team LIKE ? THEN 'assigned_team'
             ELSE 'unknown'
           END as matchedField
    FROM tasks
    WHERE (user_id = ? OR user_id = 'system')
      AND (project_name LIKE ? OR location LIKE ? OR notes LIKE ? OR assigned_team LIKE ?)
  `).all(
    likePattern, likePattern, likePattern, likePattern,
    userId,
    likePattern, likePattern, likePattern, likePattern
  );

  // Search schedule events - also search related task name via task_id
  const events = db.prepare(`
    SELECT se.id, se.date, se.title, se.work_content, se.location, se.assigned_team, se.notes, se.task_id,
           CASE
             WHEN se.title LIKE ? THEN 'title'
             WHEN se.work_content LIKE ? THEN 'work_content'
             WHEN se.location LIKE ? THEN 'location'
             WHEN se.notes LIKE ? THEN 'notes'
             WHEN se.assigned_team LIKE ? THEN 'assigned_team'
             WHEN t.project_name LIKE ? THEN '关联任务'
             ELSE 'unknown'
           END as matchedField
    FROM schedule_events se
    LEFT JOIN tasks t ON se.task_id = t.id
    WHERE (se.user_id = ? OR se.user_id = 'system')
      AND (se.title LIKE ? OR se.work_content LIKE ? OR se.location LIKE ? OR se.notes LIKE ? OR se.assigned_team LIKE ? OR t.project_name LIKE ?)
  `).all(
    likePattern, likePattern, likePattern, likePattern, likePattern, likePattern,
    userId,
    likePattern, likePattern, likePattern, likePattern, likePattern, likePattern
  );

  res.json({ tasks, events });
});

export default router;
