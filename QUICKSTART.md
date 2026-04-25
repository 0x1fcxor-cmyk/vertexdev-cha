# VertexDev Chat - Quick Start Deployment Guide

This is the fastest way to get VertexDev Chat live in production.

## 🚀 Option 1: Railway (Easiest - Free Tier Available)

**Time to deploy: ~5 minutes**

1. **Prepare Your Code**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo>
   git push -u origin main
   ```

2. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"

3. **Select Your Repository**
   - Choose your vertexdev-chat repository
   - Railway will auto-detect the Node.js app

4. **Add Services**
   - Click "New Service" → "Database" → "PostgreSQL"
   - Click "New Service" → "Database" → "Redis"
   - Click "New Service" → "Web Service" (if not auto-created)

5. **Configure Environment Variables**
   Go to each service and add these variables:

   **Server/Web Service:**
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=<click PostgreSQL service to get this>
   REDIS_URL=<click Redis service to get this>
   JWT_SECRET=<generate a random 32+ character string>
   CLIENT_URL=<your-railway-app-url>
   RESEND_API_KEY=<your-resend-api-key>
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   RESEND_FROM_NAME=VertexDev Chat
   ```

   **Client (if separate service):**
   ```
   VITE_SOCKET_URL=<your-railway-app-url>
   VITE_API_URL=<your-railway-app-url>/api
   ```

6. **Deploy**
   - Railway will automatically deploy
   - Wait for the green checkmark
   - Click the generated URL to access your app!

## 🐳 Option 2: Docker Compose (Recommended for VPS)

**Time to deploy: ~15 minutes**

### Prerequisites
- A VPS (DigitalOcean, Linode, Hetzner, etc.)
- Ubuntu 20.04+ or similar
- Domain name pointing to your VPS IP

### Steps

1. **SSH into your VPS**
   ```bash
   ssh root@your-vps-ip
   ```

2. **Install Docker and Docker Compose**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   chmod +x /usr/local/bin/docker-compose
   ```

3. **Clone Your Repository**
   ```bash
   git clone <your-repo-url>
   cd vertexdev-chat
   ```

4. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   nano .env
   ```
   
   Update these values:
   - `POSTGRES_PASSWORD` - Generate a secure password
   - `REDIS_PASSWORD` - Generate a secure password
   - `JWT_SECRET` - Generate a random 32+ character string
   - `CLIENT_URL` - Your domain (e.g., https://chat.yourdomain.com)
   - `RESEND_API_KEY` - Your Resend API key
   - `RESEND_FROM_EMAIL` - Your email domain

5. **Deploy with Docker Compose**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

6. **Setup SSL with Certbot**
   ```bash
   # Install Certbot
   apt install certbot python3-certbot-nginx -y
   
   # Get SSL certificate
   certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

7. **Configure Nginx**
   ```bash
   nano /etc/nginx/sites-available/vertexdev
   ```
   
   Add this configuration:
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

       location /api {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location /socket.io {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location / {
           proxy_pass http://localhost:80;
       }
   }
   ```

   Enable the site:
   ```bash
   ln -s /etc/nginx/sites-available/vertexdev /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

8. **Done!** Your app is now live at https://yourdomain.com

## ⚡ Option 3: Vercel + Render (Free Tier Available)

**Time to deploy: ~10 minutes**

### Deploy Client to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Vercel will auto-detect the client folder
5. Set environment variables:
   ```
   VITE_SOCKET_URL=<your-render-url>
   VITE_API_URL=<your-render-url>/api
   ```
6. Deploy!

### Deploy Server to Render

1. Go to [render.com](https://render.com)
2. Create a new "Web Service"
3. Connect your GitHub repository
4. Set root directory to `server`
5. Set build command: `npm install`
6. Set start command: `npm start`
7. Add environment variables (see Railway section)
8. Add PostgreSQL and Redis databases
9. Deploy!

## 📧 Setup Resend Email (Required for All Options)

1. **Create Resend Account**
   - Go to [resend.com](https://resend.com)
   - Sign up (free tier available)

2. **Get API Key**
   - Go to API Keys section
   - Create new API key
   - Copy the key

3. **Verify Your Domain**
   - Go to Domains section
   - Add your domain (e.g., mail.yourdomain.com)
   - Add DNS records to your domain registrar
   - Wait for verification

4. **Add to Environment Variables**
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   RESEND_FROM_NAME=VertexDev Chat
   ```

## 🔑 Generate Secure Secrets

**Generate JWT Secret:**
```bash
# Linux/Mac
openssl rand -base64 32

# Or use an online generator
# https://generate-random.org/api-key-generator
```

**Generate Database Password:**
```bash
# Linux/Mac
openssl rand -base64 24
```

## ✅ Post-Deployment Checklist

After deployment, verify:

- [ ] App loads at your domain
- [ ] User registration works
- [ ] Email verification arrives (check spam folder)
- [ ] Password reset email arrives
- [ ] WebSocket connection works (check browser console)
- [ ] Messages send and receive in real-time
- [ ] Typing indicators work
- [ ] Right-click context menus work
- [ ] Health check endpoint responds: `https://yourdomain.com/health`

## 📊 Monitor Your Deployment

**Health Check:**
```bash
curl https://yourdomain.com/health
```

**WebSocket Stats:**
```bash
curl https://yourdomain.com/api/websocket-monitoring/stats
```

**View Logs:**
- Railway: Dashboard → Logs
- Docker: `docker-compose logs -f`
- PM2: `pm2 logs vertexdev-server`

## 🆘 Common Issues

**WebSocket not connecting:**
- Check if WSS (secure WebSocket) is used for HTTPS
- Verify CORS settings
- Check firewall rules

**Email not sending:**
- Verify Resend API key
- Check if domain is verified in Resend
- Check DNS records

**Database connection error:**
- Verify DATABASE_URL format
- Check if PostgreSQL is running
- Verify credentials

## 🎉 You're Live!

Your VertexDev Chat is now in production! 

For more detailed information, see [DEPLOYMENT.md](./DEPLOYMENT.md).

**Need Help?**
- Check the troubleshooting section
- Review logs
- Check the WebSocket monitoring dashboard
