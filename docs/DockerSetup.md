# Docker development setup

The repository has two Docker Compose files at its root, for two different jobs.

| File | Runs | Use it for |
|---|---|---|
| `docker-compose.yml` | the whole platform: web, API, MongoDB, Redis, MinIO, the image service and the notification worker | trying everything with one command: `docker compose up --build --wait` (or `pnpm stack:up`), then open `http://localhost:3000` |
| `docker-compose.local.yml` | only the infrastructure (MongoDB, and with `--profile redis`, `images` or `notifications`, Redis, MinIO and the Go services) | developing: you run the apps yourself with `pnpm dev` and get hot reload |

Both files are for local use. Their passwords and secrets are examples that anyone who reads the file knows, so never reuse them.

For the full frontend, API, and MongoDB setup with hot reload, follow the [local development guide](./LocalDevSetup.md).

## The whole stack

```bash
docker compose up --build --wait   # start everything, return when every service is healthy
docker compose ps                  # who is running, and healthy
docker compose logs -f api         # follow one service
docker compose down                # stop
docker compose down -v             # stop and delete the data (database, images, queue)
```

Each service waits for what it needs: the API for MongoDB and Redis, the web app for the API, the image service for its storage bucket. A service counts as healthy when its own check passes (`/health` on the API, which needs MongoDB to answer; `/healthz` on the Go services, which exit with `healthcheck` as the container's check because their image has no shell; `/` on the web app).

The web app's address for the API (`VITE_API_URL`) is built into the page, so it is an address your browser uses (`http://localhost:5050`), not a service name. Change it with the build argument in `docker-compose.yml` and rebuild.

To follow one action through every service, take the id from the `X-Request-Id` header of any API response and search the logs for it: `docker compose logs | grep <id>`.

## Run the frontend container

The frontend also has a standalone development container configured in `apps/web/docker-compose.dev.yaml`.
This container runs the frontend only; it does not start the API or MongoDB.

1. Install and start [Docker Desktop](https://docs.docker.com/get-docker/) or another Docker Compose compatible runtime.
2. From the repository root, install workspace dependencies as described in the [local development guide](./LocalDevSetup.md#1-install-dependencies).
3. Create `apps/web/.env` from `apps/web/.env.example`.
4. Set `VITE_API_URL` to the API URL reachable by the browser, such as `http://localhost:5050` when the API runs on the host.
5. Start the frontend container from `apps/web`:

```bash
docker compose -f docker-compose.dev.yaml up --build
```

Open `http://localhost:3000/` in a browser.
Stop the container with `docker compose -f docker-compose.dev.yaml down`.

The frontend container uses the frontend's `Dockerfile` and mounts `apps/web/src` for development changes.
Its environment file contains frontend `VITE_` settings; backend settings belong in `apps/api/.env`.
