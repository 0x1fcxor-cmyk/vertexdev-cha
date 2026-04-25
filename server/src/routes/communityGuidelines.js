import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Create community guidelines
router.post('/', async (req, res) => {
  try {
    const { serverId, title, content, version, effectiveDate } = req.body;
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

    const guidelineId = uuidv4();

    await pool.query(
      `INSERT INTO community_guidelines (id, server_id, title, content, version, effective_date, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [guidelineId, serverId, title, content, version, effectiveDate, userId]
    );

    const result = await pool.query(
      'SELECT * FROM community_guidelines WHERE id = $1',
      [guidelineId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create community guidelines error:', error);
    res.status(500).json({ error: 'Failed to create community guidelines' });
  }
});

// Get guidelines for server
router.get('/server/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT cg.*, u.username as created_by_username 
       FROM community_guidelines cg
       LEFT JOIN users u ON cg.created_by = u.id
       WHERE cg.server_id = $1
       ORDER BY cg.version DESC`,
      [serverId]
    );

    res.json({ guidelines: result.rows });
  } catch (error) {
    console.error('Get guidelines error:', error);
    res.status(500).json({ error: 'Failed to get guidelines' });
  }
});

// Accept guidelines
router.post('/:guidelineId/accept', async (req, res) => {
  try {
    const { guidelineId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `INSERT INTO guideline_acceptances (guideline_id, user_id, accepted_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (guideline_id, user_id) DO UPDATE SET accepted_at = CURRENT_TIMESTAMP`,
      [guidelineId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Accept guidelines error:', error);
    res.status(500).json({ error: 'Failed to accept guidelines' });
  }
});

// Check if user has accepted guidelines
router.get('/:guidelineId/check/:userId', async (req, res) => {
  try {
    const { guidelineId, userId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM guideline_acceptances WHERE guideline_id = $1 AND user_id = $2',
      [guidelineId, userId]
    );

    res.json({ accepted: result.rows.length > 0 });
  } catch (error) {
    console.error('Check acceptance error:', error);
    res.status(500).json({ error: 'Failed to check acceptance' });
  }
});

// Update guidelines
router.put('/:guidelineId', async (req, res) => {
  try {
    const { guidelineId } = req.params;
    const { title, content, version, effectiveDate } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const guideline = await pool.query(
      'SELECT * FROM community_guidelines WHERE id = $1 AND created_by = $2',
      [guidelineId, userId]
    );

    if (guideline.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to update this guideline' });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(title);
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      params.push(content);
    }
    if (version !== undefined) {
      updates.push(`version = $${paramIndex++}`);
      params.push(version);
    }
    if (effectiveDate !== undefined) {
      updates.push(`effective_date = $${paramIndex++}`);
      params.push(effectiveDate);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(guidelineId);

    await pool.query(
      `UPDATE community_guidelines SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
      params
    );

    const result = await pool.query(
      'SELECT * FROM community_guidelines WHERE id = $1',
      [guidelineId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update guidelines error:', error);
    res.status(500).json({ error: 'Failed to update guidelines' });
  }
});

export default router;
