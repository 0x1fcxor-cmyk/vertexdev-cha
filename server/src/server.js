import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './database/connection.js';
import { initRedis } from './redis/client.js';
import { setupSocketHandlers } from './socket/handlers.js';
import authRoutes from './routes/auth.js';
import channelRoutes from './routes/channels.js';
import messageRoutes from './routes/messages.js';
import messageEnhancedRoutes from './routes/messages-enhanced.js';
import uploadRoutes from './routes/uploads.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import commandRoutes from './routes/commands.js';
import emojiRoutes from './routes/emojis.js';
import inviteRoutes from './routes/invites.js';
import threadRoutes from './routes/threads.js';
import webrtcRoutes from './routes/webrtc.js';
import botRoutes from './routes/bots.js';
import twoFactorRoutes from './routes/twoFactor.js';
import emailVerificationRoutes from './routes/emailVerification.js';
import passwordResetRoutes from './routes/passwordReset.js';
import automodRoutes from './routes/automod.js';
import premiumRoutes from './routes/premium.js';
import analyticsRoutes from './routes/analytics.js';
import aiRoutes from './routes/ai.js';
import whiteboardRoutes from './routes/whiteboard.js';
import friendsRoutes from './routes/friends.js';
import marketplaceRoutes from './routes/marketplace.js';
import dmRoutes from './routes/dm.js';
import apiRoutes from './routes/api.js';
import webhooksRoutes from './routes/webhooks.js';
import searchRoutes from './routes/search.js';
import voiceSettingsRoutes from './routes/voiceSettings.js';
import fingerprintingRoutes from './routes/fingerprinting.js';
import verificationRoutes from './routes/verification.js';
import analyticsRealtimeRoutes from './routes/analyticsRealtime.js';
import socialGraphRoutes from './routes/socialGraph.js';
import accessibilityRoutes from './routes/accessibility.js';
import performanceRoutes from './routes/performance.js';
import gameOverlayRoutes from './routes/gameOverlay.js';
import documentsRoutes from './routes/documents.js';
import spatialAudioRoutes from './routes/spatialAudio.js';
import voiceEnhancementRoutes from './routes/voiceEnhancement.js';
import botSDKRoutes from './routes/botSDK.js';
import serverCustomizationRoutes from './routes/serverCustomization.js';
import userCustomizationRoutes from './routes/userCustomization.js';
import securityRoutes from './routes/security.js';
import translationRoutes from './routes/translation.js';
import scheduledMessagesRoutes from './routes/scheduledMessages.js';
import pollsRoutes from './routes/polls.js';
import voiceToTextRoutes from './routes/voiceToText.js';
import pinnedMessagesRoutes from './routes/pinnedMessages.js';
import customCommandsRoutes from './routes/customCommands.js';
import advancedModerationRoutes from './routes/advancedModeration.js';
import achievementsRoutes from './routes/achievements.js';
import serverTemplatesRoutes from './routes/serverTemplates.js';
import eventsRoutes from './routes/events.js';
import ticketsRoutes from './routes/tickets.js';
import giveawaysRoutes from './routes/giveaways.js';
import videoMessagesRoutes from './routes/videoMessages.js';
import crossPlatformSyncRoutes from './routes/crossPlatformSync.js';
import offlineModeRoutes from './routes/offlineMode.js';
import pluginsRoutes from './routes/plugins.js';
import advancedPermissionsRoutes from './routes/advancedPermissions.js';
import discoveryRoutes from './routes/discovery.js';
import communityGuidelinesRoutes from './routes/communityGuidelines.js';
import warningsRoutes from './routes/warnings.js';
import websocketMonitoringRoutes from './routes/websocketMonitoring.js';
import WebSocketMonitor from './socket/WebSocketMonitor.js';
import {
  securityHeaders,
  csrfProtection,
  sanitizeInput,
  ipFilter,
  accountLockout,
  sessionSecurity,
  detectSuspiciousActivity,
  logApiRequest,
  validateFileUpload,
  adminOnly,
  strictRateLimiter,
  authRateLimiter,
  apiRateLimiter
} from './middleware/security.js';
import { rateLimit } from './middleware/rateLimit.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173'
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', rateLimit('auth'), authRoutes);
app.use('/api/channels', rateLimit(), channelRoutes);
app.use('/api/messages', rateLimit('message'), messageRoutes);
app.use('/api/messages', rateLimit('message'), messageEnhancedRoutes);
app.use('/api/uploads', rateLimit('upload'), uploadRoutes);
app.use('/api/notifications', rateLimit(), notificationRoutes);
app.use('/api/admin', rateLimit(), adminRoutes);
app.use('/api/commands', rateLimit('command'), commandRoutes);
app.use('/api/emojis', rateLimit(), emojiRoutes);
app.use('/api/invites', rateLimit('auth'), inviteRoutes);
app.use('/api/threads', rateLimit(), threadRoutes);
app.use('/api/webrtc', rateLimit(), webrtcRoutes);
app.use('/api/bots', rateLimit(), botRoutes);
app.use('/api/two-factor', rateLimit('auth'), twoFactorRoutes);
app.use('/api/email-verification', rateLimit('auth'), emailVerificationRoutes);
app.use('/api/password-reset', rateLimit('auth'), passwordResetRoutes);
app.use('/api/automod', rateLimit(), automodRoutes);
app.use('/api/premium', rateLimit(), premiumRoutes);
app.use('/api/analytics', rateLimit(), analyticsRoutes);
app.use('/api/analytics-realtime', rateLimit(), analyticsRealtimeRoutes);
app.use('/api/ai', rateLimit('command'), aiRoutes);
app.use('/api/whiteboard', rateLimit(), whiteboardRoutes);
app.use('/api/friends', rateLimit(), friendsRoutes);
app.use('/api/marketplace', rateLimit(), marketplaceRoutes);
app.use('/api/dm', rateLimit('message'), dmRoutes);
app.use('/api/api-keys', rateLimit('auth'), apiRoutes);
app.use('/api/webhooks', rateLimit(), webhooksRoutes);
app.use('/api/search', rateLimit(), searchRoutes);
app.use('/api/voice-settings', rateLimit(), voiceSettingsRoutes);
app.use('/api/fingerprinting', rateLimit('auth'), fingerprintingRoutes);
app.use('/api/verification', rateLimit('auth'), verificationRoutes);
app.use('/api/social-graph', rateLimit(), socialGraphRoutes);
app.use('/api/accessibility', rateLimit(), accessibilityRoutes);
app.use('/api/performance', rateLimit(), performanceRoutes);
app.use('/api/game-overlay', rateLimit(), gameOverlayRoutes);
app.use('/api/documents', rateLimit(), documentsRoutes);
app.use('/api/spatial-audio', rateLimit(), spatialAudioRoutes);
app.use('/api/voice-enhancement', rateLimit(), voiceEnhancementRoutes);
app.use('/api/bot-sdk', rateLimit(), botSDKRoutes);
app.use('/api/server-customization', rateLimit(), serverCustomizationRoutes);
app.use('/api/user-customization', rateLimit(), userCustomizationRoutes);
app.use('/api/security', adminOnly, strictRateLimiter, securityRoutes);
app.use('/api/translation', rateLimit(), translationRoutes);
app.use('/api/scheduled-messages', rateLimit(), scheduledMessagesRoutes);
app.use('/api/polls', rateLimit(), pollsRoutes);
app.use('/api/voice-to-text', rateLimit(), voiceToTextRoutes);
app.use('/api/pinned-messages', rateLimit(), pinnedMessagesRoutes);
app.use('/api/custom-commands', rateLimit(), customCommandsRoutes);
app.use('/api/advanced-moderation', rateLimit(), advancedModerationRoutes);
app.use('/api/achievements', rateLimit(), achievementsRoutes);
app.use('/api/server-templates', rateLimit(), serverTemplatesRoutes);
app.use('/api/events', rateLimit(), eventsRoutes);
app.use('/api/tickets', rateLimit(), ticketsRoutes);
app.use('/api/giveaways', rateLimit(), giveawaysRoutes);
app.use('/api/video-messages', rateLimit(), videoMessagesRoutes);
app.use('/api/cross-platform-sync', rateLimit(), crossPlatformSyncRoutes);
app.use('/api/offline-mode', rateLimit(), offlineModeRoutes);
app.use('/api/plugins', rateLimit(), pluginsRoutes);
app.use('/api/advanced-permissions', rateLimit(), advancedPermissionsRoutes);
app.use('/api/discovery', rateLimit(), discoveryRoutes);
app.use('/api/community-guidelines', rateLimit(), communityGuidelinesRoutes);
app.use('/api/warnings', rateLimit(), warningsRoutes);

// Security middleware
app.use(securityHeaders);
app.use(sanitizeInput);
app.use(logApiRequest);
app.use(sessionSecurity);

// IP filtering and account lockout (apply before routes)
app.use(ipFilter);
app.use('/api/auth', accountLockout);
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize services
async function startServer() {
  try {
    // Initialize PostgreSQL
    await initDatabase();
    console.log('✓ PostgreSQL connected');

    // Initialize Redis
    const redis = await initRedis();
    console.log('✓ Redis connected');

    // Setup Socket.io handlers
    setupSocketHandlers(io, redis);
    
    // Setup robust WebSocket handlers
    const robustHandlers = new RobustSocketHandlers(io, redis, {
      jwtSecret: process.env.JWT_SECRET,
      enableRateLimit: true,
      enablePresence: true,
      enableMessageAck: true,
      enableDeduplication: true
    });
    
    // Expose handlers for external access
    global.robustSocketHandlers = robustHandlers;
    
    // Setup WebSocket monitoring
    const monitor = new WebSocketMonitor(robustHandlers);
    monitor.start();
    global.webSocketMonitor = monitor;
    
    console.log('✓ Socket.io handlers configured (robust)');
    console.log('✓ WebSocket monitoring started');

    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 WebSocket server ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
