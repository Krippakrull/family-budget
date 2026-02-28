import { env } from '$env/dynamic/private';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const sqlite = new Database(env.DATABASE_URL || './data/budget.db');

sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
