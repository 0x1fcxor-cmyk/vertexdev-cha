import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Create server template
router.post('/', async (req, res) => {
  try {
    const { name, description, category, icon, isPublic, channels, roles, settings } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const templateId = uuidv4();

    await pool.query(
      `INSERT INTO server_templates (id, name, description, category, icon, is_public, created_by, channels, roles, settings, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
      [templateId, name, description, category, icon, isPublic || false, userId, JSON.stringify(channels || []), JSON.stringify(roles || []), JSON.stringify(settings || {})]
    );

    const result = await pool.query(
      'SELECT * FROM server_templates WHERE id = $1',
      [templateId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create server template error:', error);
    res.status(500).json({ error: 'Failed to create server template' });
  }
});

// Get public templates
router.get('/public', async (req, res) => {
  try {
    const { category } = req.query;
    const pool = getPool();

    let sql = 'SELECT st.*, u.username as creator_username, COUNT(stu.id) as usage_count FROM server_templates st LEFT JOIN users u ON st.created_by = u.id LEFT JOIN server_template_usage stu ON st.id = stu.template_id WHERE st.is_public = TRUE';
    const params = [];

    if (category) {
      sql += ' AND st.category = $1';
      params.push(category);
    }

    sql += ' GROUP BY st.id, u.username ORDER BY st.usage_count DESC';

    const result = await pool.query(sql, params);

    res.json({ templates: result.rows });
  } catch (error) {
    console.error('Get public templates error:', error);
    res.status(500).json({ error: 'Failed to get public templates' });
  }
});

// Get user's templates
router.get('/my', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      `SELECT st.*, COUNT(stu.id) as usage_count 
       FROM server_templates st
       LEFT JOIN server_template_usage stu ON st.id = stu.template_id
       WHERE st.created_by = $1
       GROUP BY st.id
       ORDER BY st.created_at DESC`,
      [userId]
    );

    res.json({ templates: result.rows });
  } catch (error) {
    console.error('Get user templates error:', error);
    res.status(500).json({ error: 'Failed to get user templates' });
  }
});

// Get template details
router.get('/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT st.*, u.username as creator_username 
       FROM server_templates st
       LEFT JOIN users u ON st.created_by = u.id
       WHERE st.id = $1`,
      [templateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Use template to create server
router.post('/:templateId/use', async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const template = await pool.query(
      'SELECT * FROM server_templates WHERE id = $1',
      [templateId]
    );

    if (template.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const t = template.rows[0];

    // Create server from template
    const serverId = uuidv4();

    await pool.query(
      `INSERT INTO servers (id, owner_id, name, description, icon_url, banner_url, public, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [serverId, userId, t.name, t.description, t.icon, null, t.is_public]
    );

    // Create channels from template
    const channels = JSON.parse(t.channels);
    for (const channel of channels) {
      await pool.query(
        `INSERT INTO channels (id, server_id, name, type, position, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [uuidv4(), serverId, channel.name, channel.type || 'text', channel.position || 0]
      );
    }

    // Create roles from template
    const roles = JSON.parse(t.roles);
    for (const role of roles) {
      await pool.query(
        `INSERT INTO server_roles (id, server_id, name, color, permissions, position, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [uuidv4(), serverId, role.name, role.color || '#5865F2', JSON.stringify(role.permissions || {}), role.position || 0]
      );
    }

    // Add owner to server
    await pool.query(
      `INSERT INTO server_members (server_id, user_id, role, joined_at)
       VALUES ($1, $2, 'admin', CURRENT_TIMESTAMP)`,
      [serverId, userId]
    );

    // Log template usage
    await pool.query(
      `INSERT INTO server_template_usage (template_id, user_id, server_id, used_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [templateId, userId, serverId]
    );

    res.status(201).json({ success: true, serverId });
  } catch (error) {
    console.error('Use template error:', error);
    res.status(500).json({ error: 'Failed to use template' });
  }
});

// Update template
router.put('/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { name, description, category, icon, isPublic, channels, roles, settings } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const template = await pool.query(
      'SELECT * FROM server_templates WHERE id = $1 AND created_by = $2',
      [templateId, userId]
    );

    if (template.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to update this template' });
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
    if (category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(category);
    }
    if (icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`);
      params.push(icon);
    }
    if (isPublic !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      params.push(isPublic);
    }
    if (channels !== undefined) {
      updates.push(`channels = $${paramIndex++}`);
      params.push(JSON.stringify(channels));
    }
    if (roles !== undefined) {
      updates.push(`roles = $${paramIndex++}`);
      params.push(JSON.stringify(roles));
    }
    if (settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      params.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(templateId);

    await pool.query(
      `UPDATE server_templates SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
      params
    );

    const result = await pool.query(
      'SELECT * FROM server_templates WHERE id = $1',
      [templateId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
router.delete('/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const template = await pool.query(
      'SELECT * FROM server_templates WHERE id = $1 AND created_by = $2',
      [templateId, userId]
    );

    if (template.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this template' });
    }

    await pool.query('DELETE FROM server_templates WHERE id = $1', [templateId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
