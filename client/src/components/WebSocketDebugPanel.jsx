import { useState, useEffect } from 'react';
import Modal from './Modal';
import { robustClient } from '../lib/socket';

/**
 * WebSocket debugging panel for monitoring connection health and stats
 */
export default function WebSocketDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const currentStats = robustClient.getStats();
      const currentHealth = robustClient.getHealth();
      
      setStats(currentStats);
      setHealth(currentHealth);

      // Add log on significant events
      if (currentStats.connectionState !== stats?.connectionState) {
        addLog(`State changed: ${currentStats.connectionState}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const addLog = (message) => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      message
    }].slice(-50));
  };

  const testConnection = () => {
    addLog('Testing connection...');
    robustClient.connect();
  };

  const testMessage = () => {
    addLog('Sending test message...');
    robustClient.emit('test', { timestamp: Date.now() });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const reconnect = () => {
    addLog('Forcing reconnection...');
    robustClient.socket?.disconnect();
    setTimeout(() => robustClient.connect(), 1000);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-accent text-white px-4 py-2 rounded-lg shadow-lg interactive"
        style={{ zIndex: 10000 }}
      >
        📡 WS Debug
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="WebSocket Debug Panel"
        size="large"
      >
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="bg-secondary p-4 rounded-lg">
            <h3 className="text-lg font-bold text-primary mb-2">Connection Status</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-secondary">State:</span>
                <span className={`ml-2 ${stats?.connected ? 'text-green' : 'text-red'}`}>
                  {stats?.connectionState || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-secondary">Authenticated:</span>
                <span className={`ml-2 ${stats?.authenticated ? 'text-green' : 'text-red'}`}>
                  {stats?.authenticated ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-secondary">Connected:</span>
                <span className={`ml-2 ${stats?.connected ? 'text-green' : 'text-red'}`}>
                  {stats?.connected ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-secondary">Reconnections:</span>
                <span className="ml-2 text-primary">{stats?.reconnections || 0}</span>
              </div>
            </div>
          </div>

          {/* Health */}
          {health && (
            <div className="bg-secondary p-4 rounded-lg">
              <h3 className="text-lg font-bold text-primary mb-2">Health</h3>
              <div className={`text-sm ${health.healthy ? 'text-green' : 'text-red'}`}>
                {health.healthy ? '✓ Healthy' : '✗ Unhealthy'}
              </div>
              <div className="mt-2 text-xs text-secondary">
                Latency: {health.latency}ms
              </div>
              <div className="text-xs text-secondary">
                Last Heartbeat: {health.lastHeartbeat ? new Date(health.lastHeartbeat).toLocaleString() : 'Never'}
              </div>
            </div>
          )}

          {/* Statistics */}
          {stats && (
            <div className="bg-secondary p-4 rounded-lg">
              <h3 className="text-lg font-bold text-primary mb-2">Statistics</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-secondary">Messages Sent:</span>
                  <span className="ml-2 text-primary">{stats.messagesSent}</span>
                </div>
                <div>
                  <span className="text-secondary">Messages Received:</span>
                  <span className="ml-2 text-primary">{stats.messagesReceived}</span>
                </div>
                <div>
                  <span className="text-secondary">Messages Queued:</span>
                  <span className="ml-2 text-primary">{stats.messagesQueued}</span>
                </div>
                <div>
                  <span className="text-secondary">Messages Failed:</span>
                  <span className="ml-2 text-primary">{stats.messagesFailed}</span>
                </div>
                <div>
                  <span className="text-secondary">Disconnects:</span>
                  <span className="ml-2 text-primary">{stats.disconnects}</span>
                </div>
                <div>
                  <span className="text-secondary">Queue Size:</span>
                  <span className="ml-2 text-primary">{stats.queueSize}</span>
                </div>
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="bg-secondary p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-primary">Logs</h3>
              <button
                onClick={clearLogs}
                className="text-xs bg-tertiary px-2 py-1 rounded text-secondary interactive"
              >
                Clear
              </button>
            </div>
            <div className="bg-primary p-2 rounded max-h-40 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-secondary text-sm">No logs</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-xs text-secondary font-mono mb-1">
                    [{log.timestamp}] {log.message}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={testConnection}
              className="flex-1 bg-accent text-white px-4 py-2 rounded interactive"
            >
              Test Connection
            </button>
            <button
              onClick={testMessage}
              className="flex-1 bg-tertiary text-primary px-4 py-2 rounded interactive"
            >
              Test Message
            </button>
            <button
              onClick={reconnect}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded interactive"
            >
              Reconnect
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
