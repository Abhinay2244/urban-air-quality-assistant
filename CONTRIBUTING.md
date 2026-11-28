# Contributing to Urban Air Quality Assistant

Thank you for helping improve the Urban Air Quality Assistant.

## Prerequisites

- **Node.js `22`** (`.nvmrc` pins `22`; minimum supported engine `>=22.6.0`)
- **npm** or **Bun** (`bun.lock` is the repository lockfile)

## Local Setup

1. Install dependencies:

   ```bash
   bun install --frozen-lockfile   # or: npm install
   ```

2. Copy `.env.example` to `.env` and add secrets:
   - `GEMINI_API_KEY`: Required at runtime for `POST /api/assistant/recommendations`.
   - `AQI_API_KEY`: Optional WAQI API token; Open-Meteo is used automatically when omitted.
   - `PORT`: Optional port override (defaults to `3000`).

3. Start the local dev server (Express + Vite middleware on port `3000`):

   ```bash
   npm run dev
   ```

4. Git hooks: `husky` installs `.husky/pre-commit` automatically when `.git` is present (`prepare` is safe to skip when `.git` is absent in CI or Docker). Staged files are checked with `eslint --max-warnings 0` and `prettier --write` via `lint-staged`.

## Scripts

| Script                  | Purpose                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`           | Start Express + Vite development server                                             |
| `npm run build`         | Build production client assets into `dist/`                                         |
| `npm start`             | Start production Express server serving `dist/`                                     |
| `npm run lint`          | Run strict type-aware ESLint (`--max-warnings 0`)                                   |
| `npm run typecheck`     | Run strict TypeScript check (`tsc --noEmit`)                                        |
| `npm run format:check`  | Verify Prettier formatting                                                          |
| `npm run arch:check`    | Verify zero circular dependencies across `shared/`, `src/`, `server/`, `server.ts`  |
| `npm test`              | Run Vitest unit and integration suite                                               |
| `npm run test:coverage` | Run tests and enforce coverage thresholds (85/75/85/85)                             |
| `npm run check`         | Run `lint`, `typecheck`, `format:check`, `arch:check`, `test`, and `build` in order |

## Code Standards

- Keep every `.ts`/`.tsx` source file strictly under **150 lines**.
- Zero `any`, zero `eslint-disable`, zero `@ts-ignore`, and no unsafe type-assertion shortcuts.
- Add concise JSDoc comments on all exports.
- Keep secrets (`GEMINI_API_KEY`, `AQI_API_KEY`) strictly on the server; never expose them to client bundles or logs.
- Update tests and `docs/openapi.yaml` whenever `/api/*` routes or schemas change.

## Branches & Commits

- Create focused branches from `main` using prefixes like `feat/`, `fix/`, `docs/`, `chore/`, or `test/`.
- Use clear, imperative Conventional Commit subjects (e.g., `fix: map gemini 503 chain exhaustion to busy error`, `docs: add openapi 3.1 contract`).
- Run `npm run check` and `npm run test:coverage` before opening a pull request.
