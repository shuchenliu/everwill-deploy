# ===========================================================================
# Dockerfile for everwill.
# Uses node:22-slim (Debian), NOT Alpine — better-sqlite3 native bindings
# are compiled against glibc and will segfault on musl/Alpine.
# Runs TypeScript directly via tsx (no compile step needed).
# ===========================================================================

FROM node:22-slim
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

# Create the data directory for SQLite persistence
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["pnpm", "start"]
