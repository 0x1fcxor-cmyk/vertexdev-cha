import RobustSocketHandlers from './RobustSocketHandlers.js';
import { setupSocketHandlers } from './handlers.js';

/**
 * Setup both legacy and robust WebSocket handlers
 */
export function setupAllSocketHandlers(io, redis, options = {}) {
  // Setup legacy handlers for backward compatibility
  setupSocketHandlers(io, redis);

  // Setup robust handlers
  const robustHandlers = new RobustSocketHandlers(io, redis, options);

  return robustHandlers;
}

export { RobustSocketHandlers };
export { default as setupSocketHandlers } from './handlers.js';
