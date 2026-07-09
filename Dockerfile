FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
# drizzle-kit（devDependency）需要留著，啟動時用它自動套用資料庫 migration
RUN pnpm install --frozen-lockfile --prod=false
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
COPY drizzle.config.ts ./
EXPOSE 3000
CMD ["sh", "-c", "pnpm db:migrate && pnpm start"]
