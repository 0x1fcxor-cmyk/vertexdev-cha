import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';
import { initRedis } from '../redis/client.js';

const router = express.Router();

// Store whiteboard data in Redis for real-time collaboration
async function getWhiteboardData(channelId) {
  const redis = await initRedis();
  const data = await redis.get(`whiteboard:${channelId}`);
  return data ? JSON.parse(data) : { elements: [], cursors: {} };
}

async function setWhiteboardData(channelId, data) {
  const redis = await initRedis();
  await redis.set(`whiteboard:${channelId}`, JSON.stringify(data), 'EX', 86400); // 24 hour expiry
}

// Get whiteboard data
router.get('/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const data = await getWhiteboardData(channelId);
    res.json(data);
  } catch (error) {
    console.error('Get whiteboard error:', error);
    res.status(500).json({ error: 'Failed to get whiteboard data' });
  }
});

// Update whiteboard
router.put('/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { elements, cursor } = req.body;
    const userId = req.headers['x-user-id'];
    
    const data = await getWhiteboardData(channelId);
    
    if (elements) {
      data.elements = elements;
    }
    
    if (cursor) {
      data.cursors[userId] = cursor;
    }
    
    await setWhiteboardData(channelId, data);
    
    // Emit update via Socket.io
    const io = req.app.get('io');
    io.to(`whiteboard:${channelId}`).emit('whiteboard:update', data);
    
    res.json({ success: true, data });
  } catch (error) {
    console.error('Update whiteboard error:', error);
    res.status(500).json({ error: 'Failed to update whiteboard' });
  }
});

// Clear whiteboard
router.delete('/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const redis = await initRedis();
    await redis.del(`whiteboard:${channelId}`);
    
    const io = req.app.get('io');
    io.to(`whiteboard:${channelId}`).emit('whiteboard:clear');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Clear whiteboard error:', error);
    res.status(500).json({ error: 'Failed to clear whiteboard' });
  }
});

// Add element to whiteboard
router.post('/:channelId/elements', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { element } = req.body;
    
    const data = await getWhiteboardData(channelId);
    element.id = uuidv4();
    element.createdAt = new Date().toISOString();
    data.elements.push(element);
    
    await setWhiteboardData(channelId, data);
    
    const io = req.app.get('io');
    io.to(`whiteboard:${channelId}`).emit('whiteboard:element:add', element);
    
    res.json({ success: true, element });
  } catch (error) {
    console.error('Add element error:', error);
    res.status(500).json({ error: 'Failed to add element' });
  }
});

// Update element
router.put('/:channelId/elements/:elementId', async (req, res) => {
  try {
    const { channelId, elementId } = req.params;
    const { updates } = req.body;
    
    const data = await getWhiteboardData(channelId);
    const elementIndex = data.elements.findIndex(e => e.id === elementId);
    
    if (elementIndex === -1) {
      return res.status(404).json({ error: 'Element not found' });
    }
    
    data.elements[elementIndex] = { ...data.elements[elementIndex], ...updates, updatedAt: new Date().toISOString() };
    
    await setWhiteboardData(channelId, data);
    
    const io = req.app.get('io');
    io.to(`whiteboard:${channelId}`).emit('whiteboard:element:update', { id: elementId, updates });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update element error:', error);
    res.status(500).json({ error: 'Failed to update element' });
  }
});

// Delete element
router.delete('/:channelId/elements/:elementId', async (req, res) => {
  try {
    const { channelId, elementId } = req.params;
    
    const data = await getWhiteboardData(channelId);
    data.elements = data.elements.filter(e => e.id !== elementId);
    
    await setWhiteboardData(channelId, data);
    
    const io = req.app.get('io');
    io.to(`whiteboard:${channelId}`).emit('whiteboard:element:delete', { id: elementId });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete element error:', error);
    res.status(500).json({ error: 'Failed to delete element' });
  }
});

// Update cursor position
router.put('/:channelId/cursor', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { x, y, color, name } = req.body;
    const userId = req.headers['x-user-id'];
    
    const data = await getWhiteboardData(channelId);
    data.cursors[userId] = { x, y, color, name, lastSeen: new Date().toISOString() };
    
    await setWhiteboardData(channelId, data);
    
    const io = req.app.get('io');
    io.to(`whiteboard:${channelId}`).emit('whiteboard:cursor:update', { userId, cursor: data.cursors[userId] });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update cursor error:', error);
    res.status(500).json({ error: 'Failed to update cursor' });
  }
});

export default router;
