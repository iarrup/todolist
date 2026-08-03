import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

/** On-device SQLite file name (Phase 1 is local-only; no backend/sync). */
export const DATABASE_NAME = 'pocket-notebook.db';

/**
 * Raw expo-sqlite handle. `enableChangeListener` lets Drizzle's `useLiveQuery`
 * re-render screens when the data changes (used by the Today view).
 */
export const sqliteDb = openDatabaseSync(DATABASE_NAME, {
  enableChangeListener: true,
});

/** App-wide Drizzle instance, typed against the schema. */
export const db = drizzle(sqliteDb, { schema });
