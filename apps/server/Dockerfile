FROM node:22

WORKDIR /app

RUN npm install -g pnpm@10.15.0

COPY pnpm-workspace.yaml package.json ./

COPY apps/server/package.json apps/server/package.json

COPY turbo.json turbo.json

COPY packages/hono/package.json packages/hono/package.json
COPY packages/logger/package.json packages/logger/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/utils/package.json packages/utils/package.json
COPY packages/zod/package.json packages/zod/package.json



RUN pnpm install



COPY apps/server apps/server

COPY packages/hono packages/hono
COPY packages/logger packages/logger
COPY packages/typescript-config packages/typescript-config
COPY packages/utils packages/utils
COPY packages/zod packages/zod


RUN pnpm build
EXPOSE 4000

CMD ["pnpm", "--filter", "server", "start"]

# from toot mono repo build the docker image with the following command:
# docker build -t ims-server -f ./apps/server/Dockerfile .

# run the docker image with the following command:
# docker run -p 4000:4000 ims-server
