-- 建设工程团队待办与周历管理系统数据库

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#1890ff',
  members TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  location TEXT NOT NULL,
  assigned_team TEXT,
  status TEXT NOT NULL DEFAULT 'entrusted' CHECK (status IN ('entrusted', 'in_progress', 'reporting', 'completed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  planned_start_date TEXT,
  deadline TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schedule_events (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES tasks(id),
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  title TEXT NOT NULL,
  work_content TEXT,
  is_milestone INTEGER NOT NULL DEFAULT 0,
  assigned_team TEXT,
  location TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS daily_summaries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_schedule_events_date ON schedule_events(date);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);
