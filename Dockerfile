# Multi-stage build for Video Production Manager

# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app/client

# Copy frontend package files
COPY client/package*.json ./

# Install frontend dependencies
RUN npm ci --legacy-peer-deps

# Copy frontend source code
COPY client/ ./

# Build frontend for production
RUN npm run build

# Stage 2: Setup Node.js backend
FROM node:18-alpine AS backend

WORKDIR /app

# Copy backend package files
COPY package*.json ./

# Install backend dependencies
RUN npm ci --only=production

# Copy backend source code
COPY server/ ./server/
COPY scripts/ ./scripts/

# Copy built frontend from previous stage
COPY --from=frontend-build /app/client/build ./client/build

# Create uploads directory
RUN mkdir -p uploads

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "server/index.js"]