# Pocket Notebook

A minimal, friction-free mobile app for capturing **notes** (and later, tasks)
on the go. Capture is instant — no titles, no mandatory fields, just the
content. Mobile-first (Android), local-first (on-device database) in Phase 1.

See [`ideas-refined.md`](./ideas-refined.md) for the product concept and
[`PROGRESS.md`](./PROGRESS.md) for delivery status.

## Tech stack

- **React Native + Expo** (TypeScript) — one codebase, Android-first
- **Expo Router** — file-based navigation (`src/app/`)
- **expo-sqlite + Drizzle ORM** — on-device database with versioned migrations
- **Jest** (`jest-expo`) — tests

## Getting started

Prerequisites: Node.js, and the Android SDK / an Android emulator or device for
running the app.

```bash
npm install

# Generate the native android/ project (regenerated from app.json; gitignored)
npx expo prebuild --platform android

# Build and launch on a connected Android device / running emulator
npx expo run:android
```

On first launch the app applies the database migration and opens the **Today**
screen (empty until notes exist). In development builds, a **+ dev seed** button
inserts a timestamped note so you can verify persistence across restarts.

## Scripts

| Command | What it does |
|---|---|
| `npm run android` | Build + run on Android (`expo run:android`) |
| `npm start` | Start the Metro dev server |
| `npm test` | Run the Jest test suite |
| `npm run typecheck` | Type-check with `tsc --noEmit` |
| `npm run lint` | Lint with `expo lint` (ESLint) |
| `npm run format` / `format:check` | Format / check app code with Prettier |
| `npm run db:generate` | Regenerate a migration after editing `src/db/schema.ts` |

## Project layout

```
src/
  app/          Expo Router routes (_layout.tsx applies migrations; index.tsx = Today)
  db/           Storage layer: schema, client, data-access, day-range helpers
    __tests__/  Headless storage smoke test
drizzle/        Generated SQL migrations (committed)
```

## Status

Phase 1 (Notes) — foundation (F1) complete; note capture and time views to
follow. Tasks (Phase 2) and web/sync (Phase 3) come later.
