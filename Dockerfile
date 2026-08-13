# Use an official Node.js image as the base image
FROM node:22-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./
COPY vite.config.mjs .

# Install project dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Expose the port that the Vite server will run on
EXPOSE 3000

# Start the Vite development server
CMD ["npm", "run", "dev"]