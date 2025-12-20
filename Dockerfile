# syntax=docker/dockerfile:1
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3005

# Set environment variables
ENV NODE_ENV=production \
    PORT=3005 \
    HOST=0.0.0.0

# Start the application
CMD ["node", "dist/index.js"]
