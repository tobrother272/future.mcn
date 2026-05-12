FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN mkdir -p uploads/contracts uploads/images uploads/policies uploads/thumbnails uploads/violations
EXPOSE 4000
CMD ["node", "--import", "tsx/esm", "src/server.ts"]
