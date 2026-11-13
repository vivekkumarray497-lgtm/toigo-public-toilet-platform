# Production Dockerfile for TOIGO Full-Stack Sanitation Platform
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy root and package configuration
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production || npm install --production

# Copy all source files
COPY . .

# Expose default port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Start server
CMD ["node", "server/server.js"]

