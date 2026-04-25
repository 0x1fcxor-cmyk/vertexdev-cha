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
        DATABASE_URL: 'postgresql://vertexdev_user:password@localhost:5432/vertexdev_chat',
        REDIS_URL: 'redis://localhost:6379',
        REDIS_PASSWORD: 'your_redis_password',
        JWT_SECRET: 'your_very_secure_random_secret_key_at_least_32_characters',
        CLIENT_URL: 'https://yourdomain.com',
        RESEND_API_KEY: 're_xxxxxxxxxxxxxxxxx',
        RESEND_FROM_EMAIL: 'noreply@yourdomain.com',
        RESEND_FROM_NAME: 'VertexDev Chat',
        RATE_LIMIT_WINDOW_MS: 60000,
        RATE_LIMIT_MAX_REQUESTS: 100,
        SOCKET_CORS_ORIGIN: 'https://yourdomain.com',
      },
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
    }
  ]
};
