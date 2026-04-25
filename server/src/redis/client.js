import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient;
let pubClient;
let subClient;

export async function initRedis() {
  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  pubClient = redisClient.duplicate();
  subClient = redisClient.duplicate();

  await Promise.all([
    redisClient.connect(),
    pubClient.connect(),
    subClient.connect()
  ]);

  redisClient.on('error', (err) => console.error('Redis Client Error:', err));
  pubClient.on('error', (err) => console.error('Redis Pub Error:', err));
  subClient.on('error', (err) => console.error('Redis Sub Error:', err));

  return { redisClient, pubClient, subClient };
}

export function getRedisClients() {
  if (!redisClient || !pubClient || !subClient) {
    throw new Error('Redis not initialized');
  }
  return { redisClient, pubClient, subClient };
}

export async function closeRedis() {
  if (redisClient) await redisClient.quit();
  if (pubClient) await pubClient.quit();
  if (subClient) await subClient.quit();
}
