# Build context is the repo root (workspaces need the root package files).
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY web/package.json web/
RUN npm ci --workspace @ticketdash/web --include-workspace-root=false

COPY shared shared
COPY web web
RUN npm run build -w web

# Serve the static bundle with nginx; /api and /socket.io proxy to the api
# service so the browser talks to a single origin.
FROM nginx:1.27-alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html
EXPOSE 80
