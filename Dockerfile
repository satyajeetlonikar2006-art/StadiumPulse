# Use an official Node.js runtime as a parent image
FROM node:20-bullseye

# Install system dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package files first for better caching
COPY backend/package*.json ./backend/

# Install the backend dependencies
WORKDIR /app/backend
RUN npm install --production --no-audit --no-fund

# Copy the rest of the application
WORKDIR /app
COPY . .

# Set environment to production
ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/tmp/stadiumpulse.sqlite

# Start unified backend.
WORKDIR /app/backend
CMD ["sh", "-c", "cp stadiumpulse.sqlite /tmp/stadiumpulse.sqlite || cp ../stadiumpulse.sqlite /tmp/stadiumpulse.sqlite || true && node src/server.js"]



