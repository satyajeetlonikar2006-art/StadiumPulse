# Use an official Node.js runtime as a parent image
FROM node:20

# Set the working directory in the container
WORKDIR /app

# Copy the entire project
COPY . .

# Install the backend dependencies
WORKDIR /app/backend
RUN npm install

# Set environment to production
ENV NODE_ENV=production

# The port Cloud Run uses
ENV PORT=8080
EXPOSE 8080

# Set DB_PATH to /tmp because Cloud Run filesystem is read-only
ENV DB_PATH=/tmp/stadiumpulse.sqlite

# Start unified backend. Copy the seeded database to /tmp first.
# We use the larger seeded DB from the backend folder.
CMD ["sh", "-c", "cp /app/backend/stadiumpulse.sqlite /tmp/stadiumpulse.sqlite || true && PORT=${PORT:-8080} node src/server.js"]

