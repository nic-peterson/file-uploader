# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (loads .env.development)
npm start            # Start production server (Railway uses this)
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
- **Routes** → **Controllers** → **Models** (Prisma)
- Authentication: PassportJS local strategy with `express-session` + `connect-pg-simple` (sessions stored in Postgres)
- File storage: TBD — Supabase removed, will use Railway-hosted storage or similar
- Database: PostgreSQL via Prisma ORM (hosted on Railway)

```
src/
  app.js          # Express app config, middleware, routes
  server.js       # HTTP server entry point
  config/
    passport.js   # LocalStrategy, serialize/deserialize
    prisma.js     # Shared PrismaClient singleton
  controllers/    # Route handlers (auth, file, folder)
  middleware/
    isAuthenticated.js  # Redirects unauthenticated requests to /login
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

**Local dev**: `.env.development` (loaded by `npm run dev` via dotenv-cli)
**Production**: Railway injects env vars directly — no `.env` file needed.

Required vars:
- `DATABASE_URL` — PostgreSQL connection string (Railway)
- `SESSION_SECRET` — Secret for express-session
- `NODE_ENV` — `development` locally (set inline by dev script), `production` on Railway
- `PORT` — optional, defaults to 3000 (Railway sets this automatically)

## Deployment

Hosted on Railway. The GitHub service auto-deploys `main` on push. Railway runs `npm start` → `node src/server.js`. Prisma migrations must be run manually via `railway run npm run migrate:dev` or the Railway shell after schema changes.

## Code Style

ESLint + Prettier enforced. Key rules: single quotes, semicolons, `const` over `let`, `===` always, curly braces required. `console.log` triggers a warning (only `console.warn`/`console.error` allowed).
