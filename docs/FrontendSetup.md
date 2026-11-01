# Frontend setup

The frontend lives in `apps/web` and uses React, TypeScript, and Vite.
For the complete local stack, including the API and MongoDB, follow the [local development guide](./LocalDevSetup.md).

## Requirements

- Node.js 20.19+ or 22.12+, matching the frontend tooling's supported versions.
- pnpm 11.22.0, pinned by the repository root `package.json`.

## Install dependencies

Install the pinned pnpm version and workspace dependencies from the repository root:

```bash
npm install --global pnpm@11.22.0
pnpm install --frozen-lockfile
```

Copy `apps/web/.env.example` to `apps/web/.env`.
Set `VITE_API_URL` to the local API URL when you want the frontend to use a local backend.
The local stack guide documents the matching API URL and remaining environment settings.

## Run and check the frontend

```bash
pnpm --filter karmacircle-frontend dev
pnpm --filter karmacircle-frontend lint
pnpm --filter karmacircle-frontend build
pnpm type-check
```

The development server runs at `http://localhost:3000/`.
The Playwright end-to-end suite can run with `pnpm --filter karmacircle-frontend test` and starts isolated test services.

## Code conventions

Follow the existing feature-first structure and React patterns.
Keep TypeScript types accurate and run the relevant checks before opening a pull request.
The root pre-commit hook currently has `lint-staged` disabled. The separate API hook runs `lint-staged` for API files; frontend files are not automatically linted or formatted by the root hook.
