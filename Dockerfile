# Use an official Node.js runtime as a parent image
FROM node:20

# Install system dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy the entire project
COPY . .

# Install the backend dependencies
WORKDIR /app/backend
RUN npm install --production

# Set environment to production
ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/tmp/stadiumpulse.sqlite

# Start unified backend. Copy the seeded database to /tmp first.
CMD ["sh", "-c", "cp stadiumpulse.sqlite /tmp/stadiumpulse.sqlite || true && node src/server.js"]


