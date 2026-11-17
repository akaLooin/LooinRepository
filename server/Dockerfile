FROM node:22-slim
WORKDIR /app
# 서버는 게임 규칙 코드(game/src/core)를 그대로 가져다 쓴다
COPY game/src/core ./game/src/core
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev && npm i --no-save tsx@4
COPY server ./server
WORKDIR /app/server
ENV NODE_ENV=production PORT=8787
EXPOSE 8787
CMD ["npx", "tsx", "src/index.ts"]
