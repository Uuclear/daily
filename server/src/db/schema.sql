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
  color TEXT NOT NULL DEFAULT '#3b82f6',
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

CREATE TABLE IF NOT EXISTS weather_cache (
  date TEXT NOT NULL,
  city TEXT NOT NULL,
  condition TEXT NOT NULL,
  icon TEXT NOT NULL,
  temp_min INTEGER NOT NULL,
  temp_max INTEGER NOT NULL,
  description TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (date, city)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

ALTER TABLE tasks ADD COLUMN user_id TEXT REFERENCES users(id) DEFAULT 'system';
ALTER TABLE schedule_events ADD COLUMN user_id TEXT REFERENCES users(id) DEFAULT 'system';
ALTER TABLE daily_summaries ADD COLUMN user_id TEXT REFERENCES users(id) DEFAULT 'system';
ALTER TABLE persons ADD COLUMN user_id TEXT REFERENCES users(id) DEFAULT 'system';
ALTER TABLE teams ADD COLUMN user_id TEXT REFERENCES users(id) DEFAULT 'system';
ALTER TABLE weather_cache ADD COLUMN user_id TEXT REFERENCES users(id) DEFAULT 'system';

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_schedule_events_date ON schedule_events(date);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_user_id ON schedule_events(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_user_id ON daily_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_persons_user_id ON persons(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_user_id ON teams(user_id);
CREATE INDEX IF NOT EXISTS idx_weather_cache_user_id ON weather_cache(user_id);
