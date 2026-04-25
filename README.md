# LightChat - Real-time Discord-like Application

A full-stack real-time chat application built with React, Vite, Express, Redis, and PostgreSQL.

## Tech Stack

**Frontend:**
- React 18 with Vite
- TailwindCSS for styling
- Socket.io-client for real-time communication
- Zustand for state management

**Backend:**
- Express.js REST API
- Socket.io for WebSocket connections
- Redis for pub/sub and caching
- PostgreSQL for persistent storage

**Infrastructure:**
- Docker Compose for service orchestration
- JWT authentication
- Real-time presence tracking

## Features

- **Real-time messaging** - Instant message delivery via WebSockets
- **User presence** - Online/offline status tracking
- **Typing indicators** - See when users are typing
- **Multiple servers & channels** - Organize conversations
- **User authentication** - Secure login/registration with JWT
- **Cross-server sync** - Redis pub/sub for multi-instance support
- **Persistent storage** - All data stored in PostgreSQL

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Git

5. **Start the servers**
   ```bash
   # Terminal 1 - Server
   cd server
   npm run dev

   # Terminal 2 - Client
   cd client
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## 📦 Production Deployment

VertexDev Chat is production-ready with multiple deployment options:

### **Easiest: Railway (~5 minutes)**
See [QUICKSTART.md](./QUICKSTART.md) for detailed instructions.

### **Recommended: Docker Compose (~15 minutes)**
See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guide.

### **Free Tier Options:**
- Railway (recommended)
- Vercel (client) + Render (server)
- DigitalOcean App Platform

## ✨ Features

- **Real-time Messaging** - Instant message delivery with WebSocket
- **Dark Theme** - Beautiful dark theme with green (#22c55e) accents
- **Context Menus** - Right-click context menus throughout the UI
- **Smooth Popups** - Super smooth modal and popup animations
- **Robust WebSocket** - Exponential backoff reconnection, message queuing, heartbeat monitoring
- **Email System** - Full email integration with Resend (verification, password reset, notifications)
- **Typing Indicators** - Real-time typing status
- **User Presence** - Online/offline status tracking
- **Message Reactions** - Emoji reactions on messages
- **Message Editing/Deleting** - Full message management
- **Channel Management** - Create and manage channels
- **User Management** - Online users list with status

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

### Channels
- `GET /api/channels` - Get user's servers and channels
- `GET /api/channels/:id/messages` - Get channel messages
- `POST /api/channels` - Create new channel

### Messages
- `GET /api/messages/users/online` - Get online users
- `GET /api/messages/channels/:id/members` - Get channel members

## WebSocket Events

### Client → Server
- `authenticate` - Authenticate with JWT
- `join_channel` - Join a channel room
- `leave_channel` - Leave a channel room
- `send_message` - Send a message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator

### Server → Client
- `new_message` - New message received
- `user_status_update` - User status changed
- `user_typing` - User is typing
- `authenticated` - Authentication result

## Development

### Running individually
```bash
# Backend only
cd server && npm run dev

# Frontend only
cd client && npm run dev
```

### Docker services
```bash
# Start PostgreSQL and Redis
npm run docker:up

# Stop services
npm run docker:down
```

## Environment Variables

See `.env.example` for required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `PORT` - Server port
- `JWT_SECRET` - JWT signing secret
- `CLIENT_URL` - Frontend URL for CORS

## Production Deployment

### Web Application
1. Set environment variables
2. Build frontend: `cd client && npm run build`
3. Use production-grade PostgreSQL and Redis
4. Run with process manager (PM2, systemd)
5. Configure reverse proxy (nginx)
6. Enable HTTPS

## Windows Desktop Application

LightChat can be built as a native Windows desktop application using Electron.

### Building for Windows

#### Prerequisites
- Node.js 18+
- Windows 10 or later
- Git

#### Build Steps

1. Install all dependencies:
```bash
npm install
cd server && npm install
cd ../client && npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start PostgreSQL and Redis (required for the app to function):
```bash
npm run docker:up
```

4. Run database migration:
```bash
cd server
npm run migrate
```

5. Build the Windows executable:
```bash
npm run build:win
```

The installer will be created in the `dist/` directory.

#### Development Mode (Electron)

To run the app in Electron development mode:

```bash
# Start backend server separately
npm run dev:server

# In another terminal, start Electron
npm run electron:dev
```

Or use the full development mode which starts everything:

```bash
npm run electron:dev:full
```

#### Distribution

The build creates:
- **NSIS Installer** (`LightChat Setup 1.0.0.exe`) - Full installer with uninstaller
- **Portable Version** (`LightChat 1.0.0.exe`) - Standalone executable

Both are located in the `dist/` directory.

#### Notes

- The desktop app bundles the Express server internally
- PostgreSQL and Redis must still be running (via Docker or installed separately)
- The app creates a local server instance on startup
- All data is stored in your configured PostgreSQL database
