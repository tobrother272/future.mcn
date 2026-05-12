# Multi-stage build for Meridian MCN frontend

# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Build-time API token (passed via docker-compose build.args)
ARG VITE_API_TOKEN=""
ENV VITE_API_TOKEN=$VITE_API_TOKEN

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npx vite build

# Stage 2: Serve via nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
