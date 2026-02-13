/**
 * Prometheus Server – SQLite Database Layer (SRV-001)
 * Zero-config local database using better-sqlite3.
 */
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(__dirname, 'data');
mkdirSync(DB_DIR, { recursive: true });

const db = new Database(join(DB_DIR, 'prometheus.db'));

// Enable WAL for better concurrent performance
db.pragma('journal_mode = WAL');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Schema
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS scenarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        config TEXT NOT NULL,
        results TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_scenarios_user ON scenarios(user_id);
    CREATE INDEX IF NOT EXISTS idx_scenarios_updated ON scenarios(updated_at);
`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  User methods
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const createUser = db.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
);

export const findUserByUsername = db.prepare(
    'SELECT * FROM users WHERE username = ?'
);

export const updateLastLogin = db.prepare(
    'UPDATE users SET last_login = datetime(\'now\') WHERE id = ?'
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Scenario methods
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const insertScenario = db.prepare(
    'INSERT INTO scenarios (user_id, name, description, config) VALUES (?, ?, ?, ?)'
);

export const updateScenario = db.prepare(
    'UPDATE scenarios SET name = ?, description = ?, config = ?, results = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?'
);

export const deleteScenario = db.prepare(
    'DELETE FROM scenarios WHERE id = ? AND user_id = ?'
);

export const getScenario = db.prepare(
    'SELECT * FROM scenarios WHERE id = ? AND user_id = ?'
);

export const listScenarios = db.prepare(
    'SELECT id, name, description, created_at, updated_at FROM scenarios WHERE user_id = ? ORDER BY updated_at DESC'
);

export default db;
