# Little Circle

A small creator-follow application with a Vue 3/Vite frontend, an Express API, and SQLite persistence. Visitors receive an anonymous UUID stored in browser local storage; follow state is stored in SQLite.

## Prerequisites

- Node.js 20.19+ or 22.12+ and npm
- Playwright's Chromium browser for end-to-end tests

## Project structure

```text
backend/
  index.js              Express API and SQLite schema/seed initialization
  init-db.js            Standalone database initializer
  e2e-server.js         Isolated temporary-database server for browser tests
  tests/                Vitest + Supertest API integration tests
frontend/
  src/App.vue           Creator directory and follow interactions
  src/style.css         Responsive application styles
  run-e2e.cjs           Starts E2E tests and removes their temporary database
  tests/e2e/            Playwright browser tests
  playwright.config.ts  E2E server and browser configuration
```

## Setup

Install the backend and frontend dependencies:

```sh
npm install --prefix backend
npm install --prefix frontend
```

Copy `.env.example` to `.env` and adjust values if needed. The backend defaults to port `3000` and uses `./database.sqlite` (relative to the project root) when `DATABASE_URL` is unset.

## Initialize the database

```sh
npm --prefix backend run db:init
```

The initializer creates the `creators`, `users`, and `followers` tables, enables foreign keys, and inserts five sample creators only when the creators table is empty. The running API also initializes the database on startup.

## Run the application

Start the backend in one terminal:

```sh
npm --prefix backend run dev
```

Start the Vite frontend in another terminal:

```sh
npm --prefix frontend run dev
```

Open the URL printed by Vite. Its `/api` proxy forwards requests to the backend on port `3000`.

## Tests

Run API integration tests from the project root:

```sh
npm test
```

These use Supertest with a real SQLite database created in a temporary directory.

Install Playwright Chromium once:

```sh
cd frontend
npx playwright install chromium
```

Run the end-to-end flow from the project root:

```sh
npm run test:e2e
```

Playwright starts a separate API server and Vite frontend. The E2E API uses a per-run temporary SQLite database, removed after both test servers stop; it does not use or modify the development database.
