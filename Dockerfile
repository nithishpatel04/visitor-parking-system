FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY server/package.json ./server/
COPY server/package-lock.json* ./server/

# Install dependencies
RUN cd server && npm install --production

# Copy application code
COPY server/ ./server/
COPY client/ ./client/

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Start application
CMD ["node", "server/server.js"]
