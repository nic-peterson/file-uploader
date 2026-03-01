# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (loads .env.development)
npm run start        # Start production server (loads .env.production)
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint         # Lint with ESLint
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format with Prettier

# Prisma (always uses dotenv -e .env.development)
npm run migrate:dev  # Run migrations in development
npm run studio:dev   # Open Prisma Studio
npm run prisma:dev -- <cmd>  # Run any prisma command with dev env
```

To run a single test file: `npx jest __tests__/app.test.js`

## Architecture

**Entry point**: `src/server.js` — loads env and starts the HTTP listener. App logic lives in `src/app.js`.

The app is a standard Express MVC app:
- **Routes** → **Controllers** → **Models** (Prisma) / **Services** (Supabase)
- Authentication: PassportJS local strategy with `express-session` + `connect-pg-simple` (sessions stored in Postgres)
- File storage: Files go through Multer (in-memory buffer) → Supabase Storage; metadata (name, type, size, url, userId, folderId) stored in Postgres via Prisma
- Database: PostgreSQL via Prisma ORM

**Planned structure** (being built out on `feat/passport-auth` branch):
```
src/
  app.js          # Express app config, middleware, routes
  server.js       # HTTP server entry point
  controllers/    # Route handlers (auth, file, folder)
  models/         # Prisma data access layer (user, file, folder)
  routes/         # Express routers (auth, file, folder)
  views/          # EJS templates
__tests__/        # Jest + supertest tests
prisma/
  schema.prisma   # DB schema (User, File, Folder models)
  migrations/     # Committed migration files
```

**Database schema** — three models with these relationships:
- `User` (1) → (many) `File` and (many) `Folder`
- `File` belongs to `User`, optionally belongs to `Folder`
- `Folder` belongs to `User`, contains many `File`s

## Environment

Two env files required: `.env.development` and `.env.production`. Required vars:
- `DATABASE_URL` — PostgreSQL connection string
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon/public key
- `SESSION_SECRET` — Secret for express-session
- `PORT` — optional, defaults to 3000

## Code Style

ESLint + Prettier enforced. Key rules: single quotes, semicolons, `const` over `let`, `===` always, curly braces required. `console.log` triggers a warning (only `console.warn`/`console.error` allowed).
