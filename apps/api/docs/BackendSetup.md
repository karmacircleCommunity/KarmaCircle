# Backend setup

The API lives in `apps/api` and uses Express, TypeScript, and MongoDB.
For the full local stack with the frontend and a local MongoDB container, follow the [local development guide](../../../docs/LocalDevSetup.md).

## Requirements

- Node.js 20.19+ or 22.12+, matching the frontend tooling's supported versions.
- pnpm 11.22.0, pinned by the repository root `package.json`.
- MongoDB, either through the local Docker setup or another development database.

## Install dependencies

Install the pinned pnpm version and workspace dependencies from the repository root:

```bash
npm install --global pnpm@11.22.0
pnpm install --frozen-lockfile
```

Copy `apps/api/.env.example` to `apps/api/.env` and follow the [environment setup table](../../../docs/LocalDevSetup.md#2-set-up-the-backend-appsapi).
Use development credentials only.
Never commit `.env` files or secrets.

## Run and check the API

```bash
pnpm --filter karmacircle-api dev
pnpm --filter karmacircle-api build
pnpm type-check
pnpm --filter karmacircle-api lint
pnpm --filter karmacircle-api test
```

The API runs at `http://localhost:5050/` when configured with the local development settings.
Interactive API documentation is available at `http://localhost:5050/docs` while the API is running.
The Jest and Supertest suite uses an in-memory MongoDB and does not require a development database.

## Code conventions

Use the existing route, service, schema, and test patterns.
Document API changes in the backend specs and the API contract, and update frontend integration docs when a request or response shape changes.
Run the relevant checks before opening a pull request.
