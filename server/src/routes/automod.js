import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get automod rules for a server
router.get('/server/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM automod_rules WHERE server_id = $1 ORDER BY created_at',
      [serverId]
    );

    res.json({ rules: result.rows });
  } catch (error) {
    console.error('Get automod rules error:', error);
    res.status(500).json({ error: 'Failed to get automod rules' });
  }
});

// Create automod rule
router.post('/', async (req, res) => {
  try {
    const { serverId, ruleType, pattern, action } = req.body;

    if (!serverId || !ruleType || !pattern || !action) {
      return res.status(400).json({ error: 'Server ID, rule type, pattern, and action are required' });
    }

    const pool = getPool();
    const ruleId = uuidv4();

    await pool.query(
      `INSERT INTO automod_rules (id, server_id, rule_type, pattern, action, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [ruleId, serverId, ruleType, pattern, action]
    );

    const result = await pool.query(
      'SELECT * FROM automod_rules WHERE id = $1',
      [ruleId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create automod rule error:', error);
    res.status(500).json({ error: 'Failed to create automod rule' });
  }
});

// Update automod rule
router.put('/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { ruleType, pattern, action, enabled } = req.body;
    const pool = getPool();

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (ruleType !== undefined) {
      updates.push(`rule_type = $${paramIndex++}`);
      params.push(ruleType);
    }
    if (pattern !== undefined) {
      updates.push(`pattern = $${paramIndex++}`);
      params.push(pattern);
    }
    if (action !== undefined) {
      updates.push(`action = $${paramIndex++}`);
      params.push(action);
    }
    if (enabled !== undefined) {
      updates.push(`enabled = $${paramIndex++}`);
      params.push(enabled);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(ruleId);

    await pool.query(
      `UPDATE automod_rules SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    const result = await pool.query(
      'SELECT * FROM automod_rules WHERE id = $1',
      [ruleId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update automod rule error:', error);
    res.status(500).json({ error: 'Failed to update automod rule' });
  }
});

// Delete automod rule
router.delete('/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const pool = getPool();

    await pool.query('DELETE FROM automod_rules WHERE id = $1', [ruleId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete automod rule error:', error);
    res.status(500).json({ error: 'Failed to delete automod rule' });
  }
});

// Check message against automod rules
router.post('/check', async (req, res) => {
  try {
    const { serverId, message, userId } = req.body;
    const pool = getPool();

    // Get enabled automod rules for server
    const rulesResult = await pool.query(
      'SELECT * FROM automod_rules WHERE server_id = $1 AND enabled = TRUE',
      [serverId]
    );

    const violations = [];

    for (const rule of rulesResult.rows) {
      let matched = false;

      switch (rule.rule_type) {
        case 'word_filter':
          // Check if message contains the pattern (case-insensitive)
          const regex = new RegExp(rule.pattern, 'gi');
          matched = regex.test(message);
          break;

        case 'spam_filter':
          // Check for repeated characters or patterns
          const spamRegex = /(.{10,})\1{2,}/; // Repeated patterns
          matched = spamRegex.test(message);
          break;

        case 'link_filter':
          // Check for URLs
          const linkRegex = /https?:\/\/[^\s]+/gi;
          matched = linkRegex.test(message);
          break;
      }

      if (matched) {
        violations.push({
          ruleId: rule.id,
          ruleType: rule.rule_type,
          pattern: rule.pattern,
          action: rule.action
        });

        // Execute action based on rule
        switch (rule.action) {
          case 'delete':
            // Message should be deleted (handled by caller)
            break;
          case 'warn':
            // Send warning to user (handled by caller)
            break;
          case 'mute':
            // Mute user for 10 minutes
            await pool.query(
              `UPDATE server_members 
               SET muted = TRUE 
               WHERE server_id = $1 AND user_id = $2`,
              [serverId, userId]
            );
            break;
          case 'ban':
            // Ban user
            await pool.query(
              `UPDATE users SET status = 'banned' WHERE id = $1`,
              [userId]
            );
            await pool.query(
              `DELETE FROM server_members 
               WHERE server_id = $1 AND user_id = $2`,
              [serverId, userId]
            );
            break;
        }
      }
    }

    res.json({ violations, shouldDelete: violations.some(v => v.action === 'delete') });
  } catch (error) {
    console.error('Check automod error:', error);
    res.status(500).json({ error: 'Failed to check message against automod rules' });
  }
});

export default router;
