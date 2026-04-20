# Use an official Node.js runtime as a parent image
FROM node:18-alpine

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

# Start unified backend
CMD ["node", "src/server.js"]
