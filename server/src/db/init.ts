import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const dbPath = join(__dirname, '..', '..', 'data', 'construction.db');
const schemaPath = join(__dirname, '..', '..', 'src', 'db', 'schema.sql');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(__dirname, '..', '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(path.join(dataDir, 'construction.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'db', 'schema.sql'), 'utf-8');
    db.exec(schema);

    // Migration: add color column to tasks table if missing
    try {
      db.exec("ALTER TABLE tasks ADD COLUMN color TEXT NOT NULL DEFAULT '#3b82f6'");
    } catch {
      // Column already exists, migration already applied
    }

    // Migration: add weather_cache table if missing
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS weather_cache (
        date TEXT NOT NULL,
        city TEXT NOT NULL,
        condition TEXT NOT NULL,
        icon TEXT NOT NULL,
        temp_min INTEGER NOT NULL,
        temp_max INTEGER NOT NULL,
        description TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        PRIMARY KEY (date, city)
      )`);
    } catch {
      // Table already exists
    }

    // Migration: add users table
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`);
    } catch { /* already exists */ }

    // Migration: add user_id to all business tables
    const userColumns = [
      { table: 'tasks', col: 'user_id' },
      { table: 'schedule_events', col: 'user_id' },
      { table: 'daily_summaries', col: 'user_id' },
      { table: 'persons', col: 'user_id' },
      { table: 'teams', col: 'user_id' },
      { table: 'weather_cache', col: 'user_id' },
    ];
    for (const { table, col } of userColumns) {
      try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT REFERENCES users(id) DEFAULT 'system'`); } catch { /* already exists */ }
    }

    // Migration: add notification_settings table
    try {
      db.exec(`CREATE TABLE IF NOT EXISTS notification_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        enabled INTEGER NOT NULL DEFAULT 1,
        reminder_days INTEGER NOT NULL DEFAULT 1,
        reminder_time TEXT NOT NULL DEFAULT '08:00',
        notify_on_deadline INTEGER NOT NULL DEFAULT 1,
        notify_on_schedule INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id)
      )`);
    } catch { /* already exists */ }

    // Create default 'system' user for existing data
    try {
      db.exec(`INSERT INTO users (id, username, password_hash, display_name, role, created_at, updated_at)
        VALUES ('system', 'system', 'N/A', '系统', 'admin', datetime('now'), datetime('now'))
        ON CONFLICT(id) DO NOTHING`);
    } catch { /* already exists */ }
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
