# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json to the working directory
COPY package.json ./

# Install the application dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Set default port
ENV PORT=3000

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
