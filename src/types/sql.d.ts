// Drizzle's generated migrations import raw `.sql` files (bundled by Metro via
// the `sql` sourceExt in metro.config.js). Declare them as string modules so
// TypeScript can type-check the migration bundle.
declare module '*.sql' {
  const content: string;
  export default content;
}
