# Build stage for Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Build stage for Backend
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg

# Copy backend files
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install
COPY backend/ .

# Copy frontend build to a static folder or serve via separate Nginx
COPY --from=frontend-builder /app/frontend/.next ./.next
COPY --from=frontend-builder /app/frontend/public ./public
COPY --from=frontend-builder /app/frontend/package.json ./package.json

EXPOSE 3000 3001

CMD ["node", "backend/index.js"]
