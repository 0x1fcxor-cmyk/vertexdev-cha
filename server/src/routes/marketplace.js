import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get marketplace items
router.get('/', async (req, res) => {
  try {
    const { type, search, sort = 'created_at' } = req.query;
    const pool = getPool();

    let sql = `
      SELECT mi.*, u.username as creator_username, u.avatar_url as creator_avatar
      FROM marketplace_items mi
      LEFT JOIN users u ON mi.creator_id = u.id
      WHERE mi.approved = TRUE
    `;
    const params = [];

    if (type) {
      sql += ' AND mi.type = $1';
      params.push(type);
    }

    if (search) {
      const paramIndex = params.length + 1;
      sql += ` AND (mi.name ILIKE $${paramIndex} OR mi.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY mi.${sort} DESC LIMIT 50`;

    const result = await pool.query(sql, params);

    res.json({ items: result.rows });
  } catch (error) {
    console.error('Get marketplace items error:', error);
    res.status(500).json({ error: 'Failed to get marketplace items' });
  }
});

// Get marketplace item by ID
router.get('/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT mi.*, u.username as creator_username, u.avatar_url as creator_avatar
       FROM marketplace_items mi
       LEFT JOIN users u ON mi.creator_id = u.id
       WHERE mi.id = $1`,
      [itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get reviews
    const reviewsResult = await pool.query(
      `SELECT mr.*, u.username
       FROM marketplace_reviews mr
       LEFT JOIN users u ON mr.user_id = u.id
       WHERE mr.item_id = $1
       ORDER BY mr.created_at DESC`,
      [itemId]
    );

    res.json({ item: result.rows[0], reviews: reviewsResult.rows });
  } catch (error) {
    console.error('Get marketplace item error:', error);
    res.status(500).json({ error: 'Failed to get marketplace item' });
  }
});

// Create marketplace item
router.post('/', async (req, res) => {
  try {
    const { type, name, description, price, downloadUrl, previewUrl, version } = req.body;
    const userId = req.headers['x-user-id'];

    if (!type || !name || !downloadUrl) {
      return res.status(400).json({ error: 'Type, name, and download URL are required' });
    }

    const pool = getPool();
    const itemId = uuidv4();

    await pool.query(
      `INSERT INTO marketplace_items (id, creator_id, type, name, description, price, download_url, preview_url, version, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      [itemId, userId, type, name, description || null, price || 0.00, downloadUrl, previewUrl || null, version || '1.0.0']
    );

    const result = await pool.query(
      'SELECT * FROM marketplace_items WHERE id = $1',
      [itemId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create marketplace item error:', error);
    res.status(500).json({ error: 'Failed to create marketplace item' });
  }
});

// Update marketplace item
router.put('/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, description, price, downloadUrl, previewUrl, version, approved } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const itemCheck = await pool.query(
      'SELECT * FROM marketplace_items WHERE id = $1 AND creator_id = $2',
      [itemId, userId]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Item not found or unauthorized' });
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
    if (price !== undefined) {
      updates.push(`price = $${paramIndex++}`);
      params.push(price);
    }
    if (downloadUrl !== undefined) {
      updates.push(`download_url = $${paramIndex++}`);
      params.push(downloadUrl);
    }
    if (previewUrl !== undefined) {
      updates.push(`preview_url = $${paramIndex++}`);
      params.push(previewUrl);
    }
    if (version !== undefined) {
      updates.push(`version = $${paramIndex++}`);
      params.push(version);
    }
    if (approved !== undefined) {
      updates.push(`approved = $${paramIndex++}`);
      params.push(approved);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(itemId);

    await pool.query(
      `UPDATE marketplace_items SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    const result = await pool.query(
      'SELECT * FROM marketplace_items WHERE id = $1',
      [itemId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update marketplace item error:', error);
    res.status(500).json({ error: 'Failed to update marketplace item' });
  }
});

// Delete marketplace item
router.delete('/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership
    const itemCheck = await pool.query(
      'SELECT * FROM marketplace_items WHERE id = $1 AND creator_id = $2',
      [itemId, userId]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Item not found or unauthorized' });
    }

    await pool.query('DELETE FROM marketplace_items WHERE id = $1', [itemId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete marketplace item error:', error);
    res.status(500).json({ error: 'Failed to delete marketplace item' });
  }
});

// Add review
router.post('/:itemId/reviews', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.headers['x-user-id'];

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const pool = getPool();
    const reviewId = uuidv4();

    await pool.query(
      `INSERT INTO marketplace_reviews (id, item_id, user_id, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [reviewId, itemId, userId, rating, comment || null]
    );

    // Update item rating
    await pool.query(
      `UPDATE marketplace_items 
       SET rating = (
         SELECT AVG(rating) FROM marketplace_reviews WHERE item_id = $1
       ),
       reviews_count = reviews_count + 1
       WHERE id = $1`,
      [itemId]
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// Download item (increment counter)
router.post('/:itemId/download', async (req, res) => {
  try {
    const { itemId } = req.params;
    const pool = getPool();

    await pool.query(
      'UPDATE marketplace_items SET downloads = downloads + 1 WHERE id = $1',
      [itemId]
    );

    const result = await pool.query(
      'SELECT download_url FROM marketplace_items WHERE id = $1',
      [itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ downloadUrl: result.rows[0].download_url });
  } catch (error) {
    console.error('Download item error:', error);
    res.status(500).json({ error: 'Failed to download item' });
  }
});

// Get creator's items
router.get('/creator/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM marketplace_items WHERE creator_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    // Get total earnings
    const earningsResult = await pool.query(
      `SELECT SUM(net_amount) as total_earnings
       FROM creator_earnings
       WHERE creator_id = $1`,
      [userId]
    );

    res.json({ 
      items: result.rows, 
      totalEarnings: parseFloat(earningsResult.rows[0].total_earnings || 0)
    });
  } catch (error) {
    console.error('Get creator items error:', error);
    res.status(500).json({ error: 'Failed to get creator items' });
  }
});

export default router;
