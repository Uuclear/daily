import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const dbPath = join(__dirname, '..', '..', 'data', 'construction.db');
const schemaPath = join(__dirname, 'schema.sql');

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

    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
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
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
