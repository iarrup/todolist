import type { Config } from 'drizzle-kit';

/**
 * drizzle-kit config. `driver: 'expo'` makes `drizzle-kit generate` emit a
 * `drizzle/migrations.js` bundle that the app applies at startup via
 * `useMigrations` (see src/app/_layout.tsx).
 */
export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
