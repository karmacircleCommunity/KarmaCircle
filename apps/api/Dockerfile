# The API for the local stack (docker-compose.yml at the repository root).
# Build with the repository root as the context, because the workspace's lock
# file lives there:   docker build -f apps/api/Dockerfile .
#
# It keeps the development dependencies on purpose: the local stack runs with
# NODE_ENV=development (password reset links are captured instead of emailed,
# logs are readable), and that logger needs pino-pretty.
FROM node:22-slim

ENV CI=true \
    MONGOMS_DISABLE_POSTINSTALL=1
# The workspace pins its package manager; corepack fetches exactly that version.
RUN corepack enable

WORKDIR /repo

# Dependencies first, so a code change does not reinstall them. Both
# manifests are copied because the lock file lists both workspace packages.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter karmacircle-api...

COPY apps/api apps/api
RUN pnpm --filter karmacircle-api build

USER node
WORKDIR /repo/apps/api
EXPOSE 5050
CMD ["node", "dist/src/server.js"]
