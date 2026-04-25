FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Run database migrations
RUN npm run migrate

# Expose port
EXPOSE 3001

# Start application
CMD ["node", "src/server.js"]
