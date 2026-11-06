FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
RUN corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --filter @degust/backend --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

# pnpm хранит реальные пакеты в виртуальном store node_modules/.pnpm, а в
# apps/*/node_modules лежат симлинки. Поэтому в runtime копируем и корневой
# node_modules, чтобы симлинки разрешались.
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
# Prisma 7 загружает prisma.config.ts нативно (jiti) — копируем исходник, а не
# скомпилированный CommonJS-файл, который Prisma не может распарсить.
COPY --from=build /app/apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /app/apps/backend/fonts ./apps/backend/fonts
COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json
WORKDIR /app/apps/backend
EXPOSE 4000
CMD ["node", "dist/src/main.js"]
