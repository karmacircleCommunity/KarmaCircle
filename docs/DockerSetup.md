# Docker development setup

The repository's root Docker Compose file runs a local MongoDB container only.
For the full frontend, API, and MongoDB setup, follow the [local development guide](./LocalDevSetup.md).

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
