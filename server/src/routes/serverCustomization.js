import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Update server icon
router.post('/:serverId/icon', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { iconUrl } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if user is server owner or admin
    const permissionCheck = await pool.query(
      `SELECT * FROM servers 
       WHERE id = $1 AND (owner_id = $2 OR $2 IN (
         SELECT user_id FROM server_members 
         WHERE server_id = $1 AND role = 'admin'
       ))`,
      [serverId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await pool.query(
      'UPDATE servers SET icon_url = $1 WHERE id = $2',
      [iconUrl, serverId]
    );

    const result = await pool.query(
      'SELECT * FROM servers WHERE id = $1',
      [serverId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update server icon error:', error);
    res.status(500).json({ error: 'Failed to update server icon' });
  }
});

// Update server banner
router.post('/:serverId/banner', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { bannerUrl } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check permissions
    const permissionCheck = await pool.query(
      `SELECT * FROM servers 
       WHERE id = $1 AND (owner_id = $2 OR $2 IN (
         SELECT user_id FROM server_members 
         WHERE server_id = $1 AND role = 'admin'
       ))`,
      [serverId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await pool.query(
      'UPDATE servers SET banner_url = $1 WHERE id = $2',
      [bannerUrl, serverId]
    );

    const result = await pool.query(
      'SELECT * FROM servers WHERE id = $1',
      [serverId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update server banner error:', error);
    res.status(500).json({ error: 'Failed to update server banner' });
  }
});

// Get server customization options
router.get('/:serverId/customization', async (req, res) => {
  try {
    const { serverId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT 
        icon_url,
        banner_url,
        description,
        public,
        splash_url
       FROM servers 
       WHERE id = $1`,
      [serverId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Server not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get server customization error:', error);
    res.status(500).json({ error: 'Failed to get server customization' });
  }
});

// Update server splash image
router.post('/:serverId/splash', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { splashUrl } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const permissionCheck = await pool.query(
      `SELECT * FROM servers 
       WHERE id = $1 AND owner_id = $2`,
      [serverId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only server owner can update splash image' });
    }

    await pool.query(
      'UPDATE servers SET splash_url = $1 WHERE id = $2',
      [splashUrl, serverId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update server splash error:', error);
    res.status(500).json({ error: 'Failed to update server splash' });
  }
});

// Get available icon templates
router.get('/icon-templates', (req, res) => {
  const templates = [
    { id: 'default', name: 'Default', url: '/templates/default.png' },
    { id: 'gaming', name: 'Gaming', url: '/templates/gaming.png' },
    { id: 'tech', name: 'Tech', url: '/templates/tech.png' },
    { id: 'community', name: 'Community', url: '/templates/community.png' },
    { id: 'music', name: 'Music', url: '/templates/music.png' },
    { id: 'art', name: 'Art', url: '/templates/art.png' }
  ];

  res.json({ templates });
});

// Get available banner templates
router.get('/banner-templates', (req, res) => {
  const templates = [
    { id: 'gradient-blue', name: 'Blue Gradient', url: '/templates/banners/blue-gradient.png' },
    { id: 'gradient-purple', name: 'Purple Gradient', url: '/templates/banners/purple-gradient.png' },
    { id: 'gradient-green', name: 'Green Gradient', url: '/templates/banners/green-gradient.png' },
    { id: 'dark-mode', name: 'Dark Mode', url: '/templates/banners/dark-mode.png' },
    { id: 'minimal', name: 'Minimal', url: '/templates/banners/minimal.png' }
  ];

  res.json({ templates });
});

export default router;
