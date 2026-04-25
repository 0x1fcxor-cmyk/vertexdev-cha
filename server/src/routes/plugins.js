import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Create plugin
router.post('/', async (req, res) => {
  try {
    const { name, description, version, author, icon, permissions, code, manifest } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const pluginId = uuidv4();

    await pool.query(
      `INSERT INTO plugins (id, name, description, version, author, icon, permissions, code, manifest, created_by, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', CURRENT_TIMESTAMP)`,
      [pluginId, name, description, version, author, icon, JSON.stringify(permissions || []), code, JSON.stringify(manifest || {}), userId]
    );

    const result = await pool.query(
      'SELECT * FROM plugins WHERE id = $1',
      [pluginId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create plugin error:', error);
    res.status(500).json({ error: 'Failed to create plugin' });
  }
});

// Get public plugins
router.get('/public', async (req, res) => {
  try {
    const { category, search } = req.query;
    const pool = getPool();

    let sql = `SELECT p.*, u.username as author_username, COUNT(pi.id) as install_count 
               FROM plugins p
               LEFT JOIN users u ON p.created_by = u.id
               LEFT JOIN plugin_installations pi ON p.id = pi.plugin_id
               WHERE p.status = 'approved' AND p.is_public = TRUE`;
    const params = [];

    if (category) {
      sql += ' AND p.category = $' + (params.length + 1);
      params.push(category);
    }

    if (search) {
      sql += ' AND (p.name ILIKE $' + (params.length + 1) + ' OR p.description ILIKE $' + (params.length + 2) + ')';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' GROUP BY p.id, u.username ORDER BY p.created_at DESC';

    const result = await pool.query(sql, params);

    res.json({ plugins: result.rows });
  } catch (error) {
    console.error('Get public plugins error:', error);
    res.status(500).json({ error: 'Failed to get public plugins' });
  }
});

// Get user's plugins
router.get('/my', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM plugins WHERE created_by = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({ plugins: result.rows });
  } catch (error) {
    console.error('Get user plugins error:', error);
    res.status(500).json({ error: 'Failed to get user plugins' });
  }
});

// Install plugin on server
router.post('/:pluginId/install', async (req, res) => {
  try {
    const { pluginId } = req.params;
    const { serverId } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check permissions
    const permissionCheck = await pool.query(
      `SELECT * FROM server_members 
       WHERE server_id = $1 AND user_id = $2 AND (role = 'admin' OR role = 'moderator')`,
      [serverId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get plugin details
    const plugin = await pool.query(
      'SELECT * FROM plugins WHERE id = $1',
      [pluginId]
    );

    if (plugin.rows.length === 0) {
      return res.status(404).json({ error: 'Plugin not found' });
    }

    if (plugin.rows[0].status !== 'approved') {
      return res.status(400).json({ error: 'Plugin is not approved' });
    }

    await pool.query(
      `INSERT INTO plugin_installations (plugin_id, server_id, installed_by, installed_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [pluginId, serverId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Install plugin error:', error);
    res.status(500).json({ error: 'Failed to install plugin' });
  }
});

// Uninstall plugin from server
router.delete('/:pluginId/uninstall', async (req, res) => {
  try {
    const { pluginId } = req.params;
    const { serverId } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check permissions
    const permissionCheck = await pool.query(
      `SELECT * FROM server_members 
       WHERE server_id = $1 AND user_id = $2 AND (role = 'admin' OR role = 'moderator')`,
      [serverId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await pool.query(
      'DELETE FROM plugin_installations WHERE plugin_id = $1 AND server_id = $2',
      [pluginId, serverId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Uninstall plugin error:', error);
    res.status(500).json({ error: 'Failed to uninstall plugin' });
  }
});

// Get installed plugins for server
router.get('/server/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT pi.*, p.name, p.description, p.version, p.icon
       FROM plugin_installations pi
       LEFT JOIN plugins p ON pi.plugin_id = p.id
       WHERE pi.server_id = $1`,
      [serverId]
    );

    res.json({ plugins: result.rows });
  } catch (error) {
    console.error('Get installed plugins error:', error);
    res.status(500).json({ error: 'Failed to get installed plugins' });
  }
});

// Update plugin
router.put('/:pluginId', async (req, res) => {
  try {
    const { pluginId } = req.params;
    const { name, description, version, code, manifest } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const plugin = await pool.query(
      'SELECT * FROM plugins WHERE id = $1 AND created_by = $2',
      [pluginId, userId]
    );

    if (plugin.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to update this plugin' });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    if (version !== undefined) {
      updates.push(`version = $${paramIndex++}`);
      params.push(version);
    }
    if (code !== undefined) {
      updates.push(`code = $${paramIndex++}`);
      params.push(code);
    }
    if (manifest !== undefined) {
      updates.push(`manifest = $${paramIndex++}`);
      params.push(JSON.stringify(manifest));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(pluginId);

    await pool.query(
      `UPDATE plugins SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
      params
    );

    const result = await pool.query(
      'SELECT * FROM plugins WHERE id = $1',
      [pluginId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update plugin error:', error);
    res.status(500).json({ error: 'Failed to update plugin' });
  }
});

// Delete plugin
router.delete('/:pluginId', async (req, res) => {
  try {
    const { pluginId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const plugin = await pool.query(
      'SELECT * FROM plugins WHERE id = $1 AND created_by = $2',
      [pluginId, userId]
    );

    if (plugin.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this plugin' });
    }

    await pool.query('DELETE FROM plugins WHERE id = $1', [pluginId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete plugin error:', error);
    res.status(500).json({ error: 'Failed to delete plugin' });
  }
});

export default router;
