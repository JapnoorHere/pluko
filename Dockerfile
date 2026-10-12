FROM node:24-bookworm-slim
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile && pnpm build
ENV NODE_ENV=production
ENV PORT=4180
ENV HOST=0.0.0.0
EXPOSE 4180
CMD ["node", "start.mjs"]
