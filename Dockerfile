FROM node:22-alpine AS build
WORKDIR /app

COPY frontend-app/package*.json ./
RUN npm install

COPY frontend-app/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY frontend-app/nginx/entrypoint.sh /docker-entrypoint.d/40-write-config.sh
COPY frontend-app/public/config.js /usr/share/nginx/html/config.js
COPY --from=build /app/dist/storefront-ui/browser /usr/share/nginx/html
RUN chmod +x /docker-entrypoint.d/40-write-config.sh

EXPOSE 80
