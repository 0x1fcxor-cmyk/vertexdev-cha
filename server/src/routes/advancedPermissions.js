import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Create permission preset
router.post('/presets', async (req, res) => {
  try {
    const { serverId, name, description, permissions } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check permissions
    const permissionCheck = await pool.query(
      `SELECT * FROM server_members 
       WHERE server_id = $1 AND user_id = $2 AND role = 'admin'`,
      [serverId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const presetId = uuidv4();

    await pool.query(
      `INSERT INTO permission_presets (id, server_id, name, description, permissions, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [presetId, serverId, name, description, JSON.stringify(permissions), userId]
    );

    const result = await pool.query(
      'SELECT * FROM permission_presets WHERE id = $1',
      [presetId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create permission preset error:', error);
    res.status(500).json({ error: 'Failed to create permission preset' });
  }
});

// Get permission presets for server
router.get('/presets/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT pp.*, u.username as created_by_username 
       FROM permission_presets pp
       LEFT JOIN users u ON pp.created_by = u.id
       WHERE pp.server_id = $1
       ORDER BY pp.created_at DESC`,
      [serverId]
    );

    res.json({ presets: result.rows });
  } catch (error) {
    console.error('Get permission presets error:', error);
    res.status(500).json({ error: 'Failed to get permission presets' });
  }
});

// Update role permissions
router.put('/roles/:roleId/permissions', async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check permissions
    const roleCheck = await pool.query(
      `SELECT sr.*, sm.role as user_role 
       FROM server_roles sr
       LEFT JOIN server_members sm ON sr.server_id = sm.server_id
       WHERE sr.id = $1 AND sm.user_id = $2`,
      [roleId, userId]
    );

    if (roleCheck.rows.length === 0 || roleCheck.rows[0].user_role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await pool.query(
      'UPDATE server_roles SET permissions = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(permissions), roleId]
    );

    const result = await pool.query(
      'SELECT * FROM server_roles WHERE id = $1',
      [roleId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update role permissions error:', error);
    res.status(500).json({ error: 'Failed to update role permissions' });
  }
});

// Get role hierarchy
router.get('/hierarchy/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM server_roles WHERE server_id = $1 ORDER BY position ASC',
      [serverId]
    );

    res.json({ roles: result.rows });
  } catch (error) {
    console.error('Get role hierarchy error:', error);
    res.status(500).json({ error: 'Failed to get role hierarchy' });
  }
});

// Update role hierarchy
router.put('/hierarchy/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { roles } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check permissions
    const permissionCheck = await pool.query(
      `SELECT * FROM server_members 
       WHERE server_id = $1 AND user_id = $2 AND role = 'admin'`,
      [serverId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Update role positions
    for (const role of roles) {
      await pool.query(
        'UPDATE server_roles SET position = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [role.position, role.id]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update role hierarchy error:', error);
    res.status(500).json({ error: 'Failed to update role hierarchy' });
  }
});

// Get channel-specific permissions
router.get('/channels/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT * FROM channel_permissions WHERE channel_id = $1`,
      [channelId]
    );

    res.json({ permissions: result.rows });
  } catch (error) {
    console.error('Get channel permissions error:', error);
    res.status(500).json({ error: 'Failed to get channel permissions' });
  }
});

// Set channel-specific permissions
router.post('/channels/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { roleId, permissions } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check permissions
    const permissionCheck = await pool.query(
      `SELECT c.server_id, sm.role 
       FROM channels c
       LEFT JOIN server_members sm ON c.server_id = sm.server_id
       WHERE c.id = $1 AND sm.user_id = $2`,
      [channelId, userId]
    );

    if (permissionCheck.rows.length === 0 || permissionCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await pool.query(
      `INSERT INTO channel_permissions (channel_id, role_id, permissions, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (channel_id, role_id) DO UPDATE SET permissions = $3, updated_at = CURRENT_TIMESTAMP`,
      [channelId, roleId, JSON.stringify(permissions)]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Set channel permissions error:', error);
    res.status(500).json({ error: 'Failed to set channel permissions' });
  }
});

// Check user's permissions
router.get('/check/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { channelId, permission } = req.query;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Get user's role
    const member = await pool.query(
      'SELECT * FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );

    if (member.rows.length === 0) {
      return res.json({ hasPermission: false });
    }

    // Admin has all permissions
    if (member.rows[0].role === 'admin') {
      return res.json({ hasPermission: true });
    }

    // Check role permissions
    const role = await pool.query(
      'SELECT * FROM server_roles WHERE server_id = $1 AND name = $2',
      [serverId, member.rows[0].role]
    );

    if (role.rows.length === 0) {
      return res.json({ hasPermission: false });
    }

    const rolePermissions = JSON.parse(role.rows[0].permissions || '{}');

    // Check channel-specific permissions if channelId provided
    if (channelId) {
      const channelPerm = await pool.query(
        'SELECT * FROM channel_permissions WHERE channel_id = $1 AND role_id = $2',
        [channelId, role.rows[0].id]
      );

      if (channelPerm.rows.length > 0) {
        const channelPermissions = JSON.parse(channelPerm.rows[0].permissions || '{}');
        return res.json({ hasPermission: channelPermissions[permission] === true });
      }
    }

    return res.json({ hasPermission: rolePermissions[permission] === true });
  } catch (error) {
    console.error('Check permissions error:', error);
    res.status(500).json({ error: 'Failed to check permissions' });
  }
});

export default router;
