/**
 * WebSocket monitoring and debugging tools
 * Provides real-time monitoring, metrics, and debugging capabilities
 */
class WebSocketMonitor {
  constructor(robustHandlers) {
    this.handlers = robustHandlers;
    this.metrics = {
      connections: [],
      messages: [],
      errors: [],
      performance: []
    };
    this.startTime = Date.now();
    this.alerts = [];
    this.thresholds = {
      maxConnections: 10000,
      maxLatency: 1000,
      maxErrorRate: 0.05,
      maxMemoryUsage: 500000000 // 500MB
    };
  }

  /**
   * Start monitoring
   */
  start() {
    // Collect metrics every 5 seconds
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 5000);

    // Check alerts every 10 seconds
    this.alertInterval = setInterval(() => {
      this.checkAlerts();
    }, 10000);

    // Clean old metrics every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60000);

    console.log('WebSocket monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    clearInterval(this.metricsInterval);
    clearInterval(this.alertInterval);
    clearInterval(this.cleanupInterval);
    console.log('WebSocket monitoring stopped');
  }

  /**
   * Collect current metrics
   */
  collectMetrics() {
    const stats = this.handlers.getStats();
    const memoryUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime;

    const metrics = {
      timestamp: Date.now(),
      ...stats,
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      },
      uptime,
      cpuUsage: process.cpuUsage()
    };

    this.metrics.performance.push(metrics);

    // Keep only last 1000 performance metrics
    if (this.metrics.performance.length > 1000) {
      this.metrics.performance.shift();
    }

    return metrics;
  }

  /**
   * Check for alerts based on thresholds
   */
  checkAlerts() {
    const stats = this.handlers.getStats();
    const memoryUsage = process.memoryUsage();
    const metrics = this.collectMetrics();

    // Check connection count
    if (stats.onlineUsers > this.thresholds.maxConnections) {
      this.triggerAlert('HIGH_CONNECTION_COUNT', {
        current: stats.onlineUsers,
        threshold: this.thresholds.maxConnections
      });
    }

    // Check memory usage
    if (memoryUsage.heapUsed > this.thresholds.maxMemoryUsage) {
      this.triggerAlert('HIGH_MEMORY_USAGE', {
        current: memoryUsage.heapUsed,
        threshold: this.thresholds.maxMemoryUsage
      });
    }

    // Check error rate
    const errorRate = stats.errors / (stats.messagesSent + stats.messagesReceived + 1);
    if (errorRate > this.thresholds.maxErrorRate) {
      this.triggerAlert('HIGH_ERROR_RATE', {
        current: errorRate,
        threshold: this.thresholds.maxErrorRate
      });
    }

    // Check for high latency (if available)
    if (metrics.latency && metrics.latency > this.thresholds.maxLatency) {
      this.triggerAlert('HIGH_LATENCY', {
        current: metrics.latency,
        threshold: this.thresholds.maxLatency
      });
    }
  }

  /**
   * Trigger an alert
   */
  triggerAlert(type, data) {
    const alert = {
      id: Date.now(),
      type,
      data,
      timestamp: new Date().toISOString()
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    console.warn(`[ALERT] ${type}:`, data);

    // Emit alert to monitoring room
    this.handlers.io.to('monitoring').emit('alert', alert);
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics() {
    const oneHourAgo = Date.now() - 3600000;

    this.metrics.performance = this.metrics.performance.filter(
      m => m.timestamp > oneHourAgo
    );

    this.metrics.connections = this.metrics.connections.filter(
      m => m.timestamp > oneHourAgo
    );

    this.metrics.messages = this.metrics.messages.filter(
      m => m.timestamp > oneHourAgo
    );

    this.metrics.errors = this.metrics.errors.filter(
      m => m.timestamp > oneHourAgo
    );
  }

  /**
   * Get monitoring dashboard data
   */
  getDashboardData() {
    const stats = this.handlers.getStats();
    const metrics = this.collectMetrics();
    const recentAlerts = this.alerts.slice(-10);

    // Calculate trends
    const performanceHistory = this.metrics.performance.slice(-60); // Last 5 minutes
    const avgLatency = performanceHistory.reduce((sum, m) => sum + (m.latency || 0), 0) / performanceHistory.length;
    const avgMemory = performanceHistory.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / performanceHistory.length;

    return {
      current: stats,
      metrics,
      alerts: recentAlerts,
      trends: {
        latency: avgLatency,
        memory: avgMemory,
        connections: performanceHistory.map(m => m.onlineUsers),
        messages: performanceHistory.map(m => m.messagesSent)
      },
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Get detailed metrics
   */
  getDetailedMetrics(timeRange = 3600000) {
    const cutoff = Date.now() - timeRange;

    return {
      performance: this.metrics.performance.filter(m => m.timestamp > cutoff),
      connections: this.metrics.connections.filter(m => m.timestamp > cutoff),
      messages: this.metrics.messages.filter(m => m.timestamp > cutoff),
      errors: this.metrics.errors.filter(m => m.timestamp > cutoff),
      alerts: this.alerts.filter(a => new Date(a.timestamp).getTime() > cutoff)
    };
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const stats = this.handlers.getStats();
    const metrics = this.collectMetrics();
    const memoryUsage = process.memoryUsage();

    const issues = [];

    // Check memory
    if (memoryUsage.heapUsed > this.thresholds.maxMemoryUsage * 0.8) {
      issues.push({
        severity: 'warning',
        type: 'memory',
        message: 'Memory usage approaching threshold',
        current: memoryUsage.heapUsed,
        threshold: this.thresholds.maxMemoryUsage
      });
    }

    // Check connections
    if (stats.onlineUsers > this.thresholds.maxConnections * 0.9) {
      issues.push({
        severity: 'warning',
        type: 'connections',
        message: 'Connection count approaching threshold',
        current: stats.onlineUsers,
        threshold: this.thresholds.maxConnections
      });
    }

    // Check error rate
    const errorRate = stats.errors / (stats.messagesSent + stats.messagesReceived + 1);
    if (errorRate > this.thresholds.maxErrorRate) {
      issues.push({
        severity: 'error',
        type: 'errors',
        message: 'Error rate exceeds threshold',
        current: errorRate,
        threshold: this.thresholds.maxErrorRate
      });
    }

    return {
      healthy: issues.filter(i => i.severity === 'error').length === 0,
      status: issues.length === 0 ? 'healthy' : 'degraded',
      issues,
      metrics
    };
  }

  /**
   * Log connection event
   */
  logConnection(event, data) {
    this.metrics.connections.push({
      timestamp: Date.now(),
      event,
      data
    });

    if (this.metrics.connections.length > 1000) {
      this.metrics.connections.shift();
    }
  }

  /**
   * Log message event
   */
  logMessage(event, data) {
    this.metrics.messages.push({
      timestamp: Date.now(),
      event,
      data
    });

    if (this.metrics.messages.length > 1000) {
      this.metrics.messages.shift();
    }
  }

  /**
   * Log error event
   */
  logError(event, data) {
    this.metrics.errors.push({
      timestamp: Date.now(),
      event,
      data
    });

    if (this.metrics.errors.length > 1000) {
      this.metrics.errors.shift();
    }
  }

  /**
   * Set custom threshold
   */
  setThreshold(key, value) {
    if (this.thresholds.hasOwnProperty(key)) {
      this.thresholds[key] = value;
      console.log(`Threshold updated: ${key} = ${value}`);
    }
  }

  /**
   * Get thresholds
   */
  getThresholds() {
    return { ...this.thresholds };
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      thresholds: this.thresholds,
      alerts: this.alerts,
      metrics: this.getDetailedMetrics()
    };
  }
}

export default WebSocketMonitor;
