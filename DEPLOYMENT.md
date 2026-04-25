# VertexDev Chat - Complete Deployment Guide

This guide will help you deploy VertexDev Chat to production with all features fully configured.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Redis Setup](#redis-setup)
5. [Email Setup with Resend](#email-setup-with-resend)
6. [Application Configuration](#application-configuration)
7. [Building the Application](#building-the-application)
8. [Deployment Options](#deployment-options)
9. [SSL/HTTPS Setup](#sslhttps-setup)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Backup & Recovery](#backup--recovery)
12. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:
- Node.js 18+ and npm installed
- PostgreSQL 14+ database
- Redis 7+ (for WebSocket scaling and caching)
- A domain name (for production)
- A Resend account (for email services)
- Basic knowledge of Linux/Unix commands
- SSH access to your server

## Environment Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd vertexdev-chat
```

### 2. Install Dependencies

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
cd client
npm install
```

## Database Setup

### Option A: Managed Database (Recommended)

**Supabase (Free Tier Available)**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your database URL from project settings
4. Run the migration script

**Neon (Free Tier Available)**
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Get your database URL
4. Run the migration script

**Railway (Free Tier Available)**
1. Go to [railway.app](https://railway.app)
2. Create a new PostgreSQL database
3. Get your database URL
4. Run the migration script

### Option B: Self-Hosted PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres psql
CREATE DATABASE vertexdev_chat;
CREATE USER vertexdev_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE vertexdev_chat TO vertexdev_user;
\q
```

**Run Migrations:**
```bash
cd server
npm run migrate
```

## Redis Setup

### Option A: Managed Redis (Recommended)

**Upstash (Free Tier Available)**
1. Go to [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Get your Redis URL

**Redis Cloud (Free Tier Available)**
1. Go to [redis.com](https://redis.com)
2. Create a new database
3. Get your Redis connection string

### Option B: Self-Hosted Redis

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: bind 0.0.0.0
# Set: requirepass your_redis_password
sudo systemctl restart redis-server
```

## Email Setup with Resend

### 1. Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for an account
3. Verify your email domain

### 2. Get API Key

1. Go to API Keys section
2. Create a new API key
3. Copy the API key

### 3. Configure Domain

1. Go to Domains section
2. Add your domain (e.g., mail.yourdomain.com)
3. Add the DNS records provided by Resend to your domain registrar

### 4. Update Environment Variables

Add these to your `.env` file:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=VertexDev Chat
```

## Application Configuration

### Server Environment Variables

Create `.env` file in the `server` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@host:5432/vertexdev_chat

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# JWT Secret (generate a secure random string)
JWT_SECRET=your_very_secure_random_secret_key_at_least_32_characters

# Client URL
CLIENT_URL=https://yourdomain.com

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=VertexDev Chat

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# WebSocket
SOCKET_CORS_ORIGIN=https://yourdomain.com
```

### Client Environment Variables

Create `.env` file in the `client` directory:

```env
VITE_SOCKET_URL=wss://yourdomain.com
VITE_API_URL=https://yourdomain.com/api
```

## Building the Application

### Build Client

```bash
cd client
npm run build
```

This creates a `dist` folder with optimized production files.

### Prepare Server

The server is already configured for production with the environment variables set.

## Deployment Options

### Option 1: Docker (Recommended for Easy Deployment)

#### Create Dockerfile (Server)

Create `server/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run migrate

EXPOSE 3001

CMD ["node", "src/server.js"]
```

#### Create Dockerfile (Client)

Create `client/Dockerfile`:
```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Create docker-compose.yml

Create `docker-compose.yml` in root:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: vertexdev_chat
      POSTGRES_USER: vertexdev_user
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass your_redis_password
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  server:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://vertexdev_user:your_password@postgres:5432/vertexdev_chat
      - REDIS_URL=redis://redis:6379
      - REDIS_PASSWORD=your_redis_password
      - JWT_SECRET=your_secure_secret
      - CLIENT_URL=https://yourdomain.com
      - RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
      - RESEND_FROM_EMAIL=noreply@yourdomain.com
      - RESEND_FROM_NAME=VertexDev Chat
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  client:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - server
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### Deploy with Docker

```bash
docker-compose up -d
```

### Option 2: PM2 (Recommended for VPS)

#### Install PM2 Globally

```bash
npm install -g pm2
```

#### Create PM2 Ecosystem File

Create `ecosystem.config.js` in root:
```javascript
module.exports = {
  apps: [
    {
      name: 'vertexdev-server',
      script: './server/src/server.js',
      cwd: '/path/to/vertexdev-chat',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'postgresql://user:password@host:5432/vertexdev_chat',
        REDIS_URL: 'redis://localhost:6379',
        REDIS_PASSWORD: 'your_redis_password',
        JWT_SECRET: 'your_secure_secret',
        CLIENT_URL: 'https://yourdomain.com',
        RESEND_API_KEY: 're_xxxxxxxxxxxxxxxxx',
        RESEND_FROM_EMAIL: 'noreply@yourdomain.com',
        RESEND_FROM_NAME: 'VertexDev Chat',
      },
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      watch: false,
    }
  ]
};
```

#### Deploy with PM2

```bash
# Build client first
cd client
npm run build

# Start server with PM2
cd ..
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Option 3: Railway (Easiest - No Server Required)

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Add your repository
5. Railway will detect the Node.js app
6. Add environment variables in Railway settings
7. Add PostgreSQL and Redis databases
8. Railway will automatically deploy

### Option 4: Vercel + Render (Free Tier Available)

**Client on Vercel:**
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Vercel will auto-detect the client
5. Set environment variables
6. Deploy

**Server on Render:**
1. Go to [render.com](https://render.com)
2. Create a new "Web Service"
3. Connect your GitHub repository
4. Set build command: `cd server && npm install`
5. Set start command: `cd server && node src/server.js`
6. Add environment variables
7. Add PostgreSQL and Redis databases
8. Deploy

## SSL/HTTPS Setup

### Option 1: Let's Encrypt (Free, Recommended)

**Ubuntu/Debian with Nginx:**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL Certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
```

### Option 2: Cloudflare (Free)

1. Create a Cloudflare account
2. Add your domain to Cloudflare
3. Change your domain's nameservers to Cloudflare's
4. Enable "Flexible SSL" in Cloudflare dashboard
5. Add your server's IP as an A record

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Client
    location / {
        root /path/to/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Server API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring & Maintenance

### Health Check Endpoint

The application includes a health check endpoint at `/health`. Configure your monitoring service to check this endpoint.

### Monitoring Tools

**Uptime Monitoring:**
- [UptimeRobot](https://uptimerobot.com) - Free
- [Pingdom](https://pingdom.com) - Free tier available

**Application Monitoring:**
- [Sentry](https://sentry.io) - Error tracking
- [LogRocket](https://logrocket.com) - Session replay

### WebSocket Monitoring

Access the WebSocket monitoring dashboard:
```
https://yourdomain.com/api/websocket-monitoring/dashboard
```

This provides real-time statistics on:
- Connection counts
- Message rates
- Error rates
- Memory usage

## Backup & Recovery

### Database Backup

**Manual Backup:**
```bash
pg_dump -U vertexdev_user vertexdev_chat > backup.sql
```

**Automated Backup with Cron:**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * pg_dump -U vertexdev_user vertexdev_chat > /backups/vertexdev_$(date +\%Y\%m\%d).sql
```

### Restore Database

```bash
psql -U vertexdev_user vertexdev_chat < backup.sql
```

### Redis Backup

Redis is ephemeral by design. For persistence:
```bash
# Enable AOF persistence in redis.conf
appendonly yes
appendfilename "appendonly.aof"
```

## Troubleshooting

### Common Issues

**1. WebSocket Connection Fails**
- Check if CORS is configured correctly
- Verify WebSocket URL in client `.env`
- Check firewall rules (port 3001 must be open)
- Check SSL certificate if using HTTPS

**2. Database Connection Error**
- Verify DATABASE_URL is correct
- Check if PostgreSQL is running
- Verify database credentials
- Check firewall rules

**3. Email Not Sending**
- Verify RESEND_API_KEY is correct
- Check if domain is verified in Resend
- Check DNS records for your domain
- Check email logs in Resend dashboard

**4. High Memory Usage**
- Check for memory leaks in WebSocket handlers
- Restart server with PM2: `pm2 restart vertexdev-server`
- Consider increasing server RAM

**5. Rate Limiting Issues**
- Adjust RATE_LIMIT_MAX_REQUESTS in environment
- Check if legitimate users are being blocked
- Consider implementing IP whitelisting

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=*
NODE_ENV=development
```

### Check Logs

**PM2:**
```bash
pm2 logs vertexdev-server
```

**Docker:**
```bash
docker-compose logs -f server
```

## Post-Deployment Checklist

- [ ] Database migrations run successfully
- [ ] Redis is connected and working
- [ ] Email service (Resend) is configured and tested
- [ ] SSL/HTTPS is enabled
- [ ] WebSocket connections work
- [ ] User registration and login works
- [ ] Email verification works
- [ ] Password reset works
- [ ] Health check endpoint responds
- [ ] Monitoring is set up
- [ ] Backups are configured
- [ ] Domain DNS is pointing correctly
- [ ] Firewall rules are configured
- [ ] Rate limiting is tested
- [ ] WebSocket debug panel works

## Support

For issues or questions:
- Check the troubleshooting section
- Review logs in `/logs` directory
- Check WebSocket monitoring dashboard
- Email support at support@vertexdev.chat

## Security Recommendations

1. Use strong, unique passwords for all services
2. Enable 2FA on all accounts
3. Keep dependencies updated
4. Use environment variables for secrets
5. Never commit `.env` files to git
6. Regularly update SSL certificates
7. Monitor for suspicious activity
8. Implement IP whitelisting for admin access
9. Use a Web Application Firewall (WAF)
10. Regular security audits

## Performance Optimization

1. Enable gzip compression in Nginx
2. Use CDN for static assets
3. Enable HTTP/2
4. Optimize images
5. Use Redis caching for frequently accessed data
6. Implement database indexing
7. Use connection pooling
8. Enable WebSocket compression
9. Monitor and optimize slow queries
10. Consider load balancing for high traffic

## Scaling

### Horizontal Scaling

For high traffic, consider:
1. Load balancer (Nginx, HAProxy)
2. Multiple server instances
3. Database read replicas
4. Redis cluster
5. CDN for static assets
6. Separate WebSocket server

### Vertical Scaling

For moderate traffic:
1. Increase server RAM
2. Use faster CPU
3. Use SSD storage
4. Increase PostgreSQL shared_buffers
5. Increase Redis maxmemory

---

**Congratulations!** Your VertexDev Chat instance is now live in production. 🎉
