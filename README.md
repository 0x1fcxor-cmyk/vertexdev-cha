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

### VertexDev Chat

![VertexDev Chat](https://img.shields.io/badge/version-1.0.0-green) ![License](https://img.shields.io/badge/license-MIT-blue) ![Status](https://img.shields.io/badge/status-production--ready-success)

A production-ready real-time messaging platform with dark theme, green accents, robust WebSocket system, Resend email integration, and comprehensive features.

## 🚀 Features

### Core Messaging
- **Real-time Messaging**: WebSocket-powered instant messaging with Socket.io
- **Message Reactions**: React to messages with emojis
- **Message Editing & Deletion**: Full message control
- **Message Threads**: Create threaded conversations
- **Message Pinning**: Pin important messages
- **Message Search**: Search through message history
- **File Attachments**: Upload and share files (images, videos, documents)
- **Voice Messages**: Record and send voice messages
- **Video Messages**: Record and send video messages
- **Mentions**: @mention users and @everyone
- **Rich Embeds**: Automatic link previews with metadata
- **Markdown Support**: Full markdown formatting with live preview
- **Code Highlighting**: Syntax highlighting for code blocks
- **Spoiler Tags**: Hide content behind spoilers
- **Quotes**: Quote and reply to messages

### Server & Channel Management
- **Server Creation**: Create unlimited servers
- **Server Customization**: Custom icons, banners, colors
- **Server Templates**: Pre-built server templates
- **Server Boosting**: Premium server upgrades with perks
- **Role System**: Create and manage custom roles
- **Advanced Permissions**: Granular permission controls
- **Channel Types**: Text, voice, announcement, and thread channels
- **Channel Categories**: Organize channels into categories
- **Channel Permissions**: Set permissions per channel
- **Slow Mode**: Rate limit messages in channels
- **Invites**: Create and manage server invites with expiration
- **Audit Logs**: Track all server activity
- **AutoMod**: Automated moderation with custom rules
- **Welcome Messages**: Custom welcome messages
- **Server Analytics**: Track growth and activity

### User Features
- **User Profiles**: Customizable profiles with bio
- **Status Indicators**: Online, idle, DND, offline
- **Custom Status**: Set custom status messages
- **Avatars**: Upload custom avatars
- **Theme Customization**: Dark/light themes, custom colors
- **Accessibility**: Comprehensive accessibility features
- **Friend System**: Add and manage friends
- **Direct Messages**: Private messaging
- **Group DMs**: Group conversations
- **Block Users**: Block unwanted users
- **Mute Channels**: Mute specific channels
- **Notification Settings**: Granular notification controls
- **Keyboard Shortcuts**: Comprehensive keyboard shortcuts

### Security
- **Two-Factor Authentication**: 2FA with TOTP
- **Email Verification**: Email verification via Resend
- **Password Reset**: Secure password reset
- **Account Lockout**: Automatic lockout after failed attempts
- **IP Filtering**: Block suspicious IPs
- **Session Security**: Secure session management
- **Rate Limiting**: API rate limiting
- **CSRF Protection**: Cross-site request forgery protection
- **XSS Protection**: Cross-site scripting protection
- **Input Sanitization**: Automatic input sanitization
- **Security Headers**: Comprehensive security headers
- **Suspicious Activity Detection**: AI-powered threat detection

### Advanced Features
- **Bots & SDK**: Bot API and SDK for custom bots
- **Webhooks**: Webhook integrations
- **API Keys**: Custom API keys
- **Whiteboard**: Collaborative whiteboard
- **Polls**: Create and manage polls
- **Giveaways**: Host giveaways
- **Events**: Create and manage events
- **Tickets**: Support ticket system
- **Marketplace**: Plugin and theme marketplace
- **Achievements**: User achievements system
- **Social Graph**: Social connections
- **Discovery**: Server discovery
- **Translation**: Real-time message translation
- **Voice Enhancement**: Noise cancellation
- **Spatial Audio**: 3D audio positioning
- **Game Overlay**: In-game overlay
- **Screen Sharing**: Share your screen
- **Video Conferencing**: Video calls
- **File Collaboration**: Collaborative editing
- **Scheduled Messages**: Schedule messages
- **Custom Commands**: Custom slash commands
- **Advanced Moderation**: Advanced moderation tools
- **Community Guidelines**: Enforce guidelines
- **Warnings System**: Issue warnings
- **Verification**: User verification
- **Fingerprinting**: Device fingerprinting
- **Plugins**: Extensible plugin system

### UI/UX
- **Dark Theme**: Beautiful dark theme with green accents
- **Light Theme**: Light theme support
- **Custom Themes**: Custom color themes
- **Keyboard Shortcuts**: Comprehensive shortcuts
- **Context Menus**: Right-click context menus
- **Drag & Drop**: Drag and drop file uploads
- **Emoji Picker**: Full emoji picker with search
- **Rich Text Editor**: Markdown with live preview
- **Virtual Scrolling**: Smooth scrolling for large lists
- **Lazy Loading**: Optimize loading
- **Skeleton Loading**: Loading skeletons
- **Progress Indicators**: Visual progress
- **Tooltips**: Helpful tooltips
- **Modals**: Beautiful modals
- **Popups**: Context-aware popups
- **Notifications**: Toast notifications
- **Responsive Design**: Mobile-friendly
- **Accessibility**: WCAG 2.1 AA compliant
- **Reduced Motion**: Respect user preferences
- **High Contrast**: High contrast mode

### Developer Features
- **REST API**: Full REST API
- **WebSocket API**: Real-time WebSocket API
- **Bot SDK**: Bot development SDK
- **Webhooks**: Webhook support
- **API Keys**: Custom API keys
- **Rate Limiting**: API rate limiting
- **Documentation**: Comprehensive API docs
- **SDK Examples**: Example implementations
- **Testing**: Comprehensive test coverage
- **Monitoring**: Real-time monitoring
- **Analytics**: Usage analytics
- **Debug Tools**: Built-in debug panel
- **Performance Metrics**: Performance tracking

### Deployment
- **Docker Support**: Docker containers
- **Docker Compose**: Multi-container deployment
- **PM2 Support**: Process management
- **Nginx Configuration**: Reverse proxy
- **SSL/HTTPS**: SSL with Let's Encrypt
- **Environment Variables**: Secure configuration
- **Health Checks**: Health endpoints
- **Graceful Shutdown**: Graceful shutdown
- **Auto-scaling**: Horizontal scaling
- **Load Balancing**: Load balancer support
- **Database Migrations**: Automated migrations
- **Backup System**: Automated backups
- **Logging**: Comprehensive logging
- **Error Tracking**: Error tracking

### PWA
- **Service Worker**: Offline support
- **App Manifest**: PWA manifest
- **Push Notifications**: Push notifications
- **Background Sync**: Background sync
- **Installable**: Install as desktop app
- **App Icons**: Custom icons
- **Splash Screen**: Custom splash screen

### Email
- **Resend Integration**: Email via Resend
- **Email Verification**: Account verification
- **Password Reset**: Password reset emails
- **Welcome Emails**: Welcome emails
- **Notification Emails**: Email notifications
- **HTML Templates**: Rich HTML emails

### Database
- **PostgreSQL**: Production-ready database
- **Redis**: Caching and pub/sub
- **Connection Pooling**: Connection pooling
- **Query Optimization**: Optimized queries
- **Indexing**: Proper indexing
- **Migrations**: Schema migrations
- **Backups**: Automated backups
- **Replication**: Replication support

### Performance
- **Caching**: Redis caching
- **CDN Support**: CDN integration
- **Image Optimization**: Auto image optimization
- **Code Splitting**: Auto code splitting
- **Tree Shaking**: Unused code elimination
- **Minification**: Code minification
- **Gzip Compression**: Gzip compression
- **Browser Caching**: Browser caching
- **Lazy Loading**: Lazy loading
- **Virtual Scrolling**: Virtual scrolling
- **Debouncing**: Debounced API calls
- **Throttling**: Throttled API calls

### Monitoring
- **WebSocket Monitoring**: Real-time monitoring
- **Connection Health**: Health tracking
- **Error Tracking**: Error tracking
- **Performance Metrics**: Performance metrics
- **User Analytics**: User analytics
- **Server Analytics**: Server analytics
- **Custom Dashboards**: Custom dashboards
- **Alerts**: Configurable alerts
- **Logs**: Centralized logging
- **Tracing**: Distributed tracing

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **Socket.io Client** - WebSocket client
- **Lucide React** - Icon library
- **Tailwind CSS** - Utility-first CSS
- **Zustand** - State management

### Backend
- **Node.js 18+** - Runtime
- **Express.js** - Web framework
- **Socket.io** - WebSocket server
- **PostgreSQL** - Database
- **Redis** - Caching & pub/sub
- **Resend** - Email service

### Deployment
- **Docker** - Containerization
- **Docker Compose** - Multi-container
- **PM2** - Process manager
- **Nginx** - Reverse proxy
- **GitHub Actions** - CI/CD

## 📦 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- npm or yarn

### Clone the repository
```bash
git clone https://github.com/0x1fcxor-cmyk/vertexdev-cha.git
cd vertexdev-cha
```

### Install dependencies
```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### Configure environment variables
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# Required variables:
# - DATABASE_URL
# - REDIS_URL
# - REDIS_PASSWORD
# - JWT_SECRET
# - RESEND_API_KEY
# - RESEND_FROM_EMAIL
# - CLIENT_URL
```

### Setup database
```bash
cd server
npm run migrate
```

### Start the application
```bash
# Start server (from server directory)
npm start

# Start client (from client directory)
npm run dev
```

The application will be available at:
- Client: http://localhost:5173
- Server: http://localhost:3001

## 🚀 Deployment

### Quick Deployment Options

#### Railway (Fastest - ~5 minutes)
See [QUICKSTART.md](QUICKSTART.md) for detailed Railway deployment instructions.

#### Vercel + Render (~10 minutes)
- Deploy client to Vercel
- Deploy server to Render
- Configure environment variables

#### Docker Compose (~15 minutes)
```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### PM2 + Nginx (~20 minutes)
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed PM2 + Nginx deployment.

### Detailed Deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment guides including:
- Railway deployment
- Vercel + Render deployment
- Docker Compose deployment
- PM2 + Nginx deployment
- SSL/HTTPS setup with Certbot
- Environment configuration
- Monitoring and maintenance
- Backup strategies
- Troubleshooting

## 📖 Documentation

- [FEATURES.md](FEATURES.md) - Complete feature list
- [DEPLOYMENT.md](DEPLOYMENT.md) - Comprehensive deployment guide
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [CHANGELOG.md](CHANGELOG.md) - Release notes and changelog

## 🔧 Configuration

### Environment Variables
See [.env.example](.env.example) for all available environment variables.

### Client Configuration
Edit `client/vite.config.js` to configure the build output and proxy settings.

### Server Configuration
Edit `server/src/server.js` to configure the server and WebSocket settings.

## 🧪 Testing

```bash
# Run client tests
cd client
npm test

# Run server tests
cd server
npm test
```

## 📊 API Documentation

The API is documented with comprehensive endpoints for:
- Authentication
- Channels
- Messages
- Users
- Servers
- Bots
- Webhooks
- And much more

See the API documentation in the `/docs` folder for detailed API reference.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Socket.io for the WebSocket library
- Resend for email services
- The open-source community

## 📞 Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/0x1fcxor-cmyk/vertexdev-cha/issues
- Documentation: See README.md, DEPLOYMENT.md, QUICKSTART.md

---

**VertexDev Chat** - Production-ready real-time messaging platform

Made with ❤️ by VertexDev configured PostgreSQL database
