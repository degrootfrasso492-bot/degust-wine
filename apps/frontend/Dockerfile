FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
RUN corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --filter @degust/frontend --frozen-lockfile

FROM base AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# Корневые файлы воркспейса нужны, чтобы Turbopack корректно определил
# monorepo-root и разрешил `next` из /app/node_modules.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY apps/frontend ./apps/frontend
WORKDIR /app/apps/frontend
RUN npm run build

# pnpm хранит реальные пакеты в виртуальном store node_modules/.pnpm, а в
# apps/*/node_modules лежат симлинки. Поэтому в runtime копируем и корневой
# node_modules, чтобы симлинки разрешались.
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY --from=build /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=build /app/apps/frontend/public ./apps/frontend/public
COPY --from=build /app/apps/frontend/package.json ./apps/frontend/package.json
COPY --from=build /app/apps/frontend/next.config.js ./apps/frontend/next.config.js
WORKDIR /app/apps/frontend
EXPOSE 3000
CMD ["npm", "run", "start"]
