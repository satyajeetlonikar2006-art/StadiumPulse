FROM node:20-bullseye

# Set the working directory
WORKDIR /app

# Copy the entire project structure
COPY . .

# Move to backend and install dependencies
WORKDIR /app/backend
RUN npm install --production

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/tmp/stadiumpulse.sqlite

# Start the server directly
CMD ["node", "src/server.js"]




