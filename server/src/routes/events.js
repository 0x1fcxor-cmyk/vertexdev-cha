import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Create event
router.post('/', async (req, res) => {
  try {
    const { serverId, channelId, name, description, startTime, endTime, location, maxAttendees, isPublic, coverImage } = req.body;
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

    const eventId = uuidv4();

    await pool.query(
      `INSERT INTO server_events (id, server_id, channel_id, name, description, start_time, end_time, location, max_attendees, is_public, cover_image, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)`,
      [eventId, serverId, channelId, name, description, startTime, endTime, location, maxAttendees, isPublic || false, coverImage, userId]
    );

    const result = await pool.query(
      'SELECT * FROM server_events WHERE id = $1',
      [eventId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Get events for server
router.get('/server/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { status } = req.query;
    const pool = getPool();

    let sql = `SELECT se.*, u.username as created_by_username 
               FROM server_events se
               LEFT JOIN users u ON se.created_by = u.id
               WHERE se.server_id = $1`;
    const params = [serverId];

    if (status) {
      sql += ' AND se.status = $2';
      params.push(status);
    }

    sql += ' ORDER BY se.start_time ASC';

    const result = await pool.query(sql, params);

    res.json({ events: result.rows });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// RSVP to event
router.post('/:eventId/rsvp', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const event = await pool.query(
      'SELECT * FROM server_events WHERE id = $1',
      [eventId]
    );

    if (event.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if event is full
    if (event.rows[0].max_attendees) {
      const attendeeCount = await pool.query(
        'SELECT COUNT(*) as count FROM event_rsvps WHERE event_id = $1 AND status = $2',
        [eventId, 'going']
      );

      if (parseInt(attendeeCount.rows[0].count) >= event.rows[0].max_attendees) {
        return res.status(400).json({ error: 'Event is full' });
      }
    }

    await pool.query(
      `INSERT INTO event_rsvps (event_id, user_id, status, rsvped_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (event_id, user_id) DO UPDATE SET status = $3, rsvped_at = CURRENT_TIMESTAMP`,
      [eventId, userId, status || 'going']
    );

    res.json({ success: true });
  } catch (error) {
    console.error('RSVP error:', error);
    res.status(500).json({ error: 'Failed to RSVP to event' });
  }
});

// Get event attendees
router.get('/:eventId/attendees', async (req, res) => {
  try {
    const { eventId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT er.*, u.username, u.avatar_url
       FROM event_rsvps er
       LEFT JOIN users u ON er.user_id = u.id
       WHERE er.event_id = $1
       ORDER BY er.rsvped_at ASC`,
      [eventId]
    );

    res.json({ attendees: result.rows });
  } catch (error) {
    console.error('Get attendees error:', error);
    res.status(500).json({ error: 'Failed to get attendees' });
  }
});

// Update event
router.put('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, description, startTime, endTime, location, maxAttendees, isPublic, coverImage, status } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership/permissions
    const eventCheck = await pool.query(
      `SELECT se.*, sm.role 
       FROM server_events se
       LEFT JOIN server_members sm ON se.server_id = sm.server_id
       WHERE se.id = $1 AND sm.user_id = $2`,
      [eventId, userId]
    );

    if (eventCheck.rows.length === 0 || eventCheck.rows[0].role === 'member') {
      return res.status(403).json({ error: 'Insufficient permissions' });
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
    if (startTime !== undefined) {
      updates.push(`start_time = $${paramIndex++}`);
      params.push(startTime);
    }
    if (endTime !== undefined) {
      updates.push(`end_time = $${paramIndex++}`);
      params.push(endTime);
    }
    if (location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      params.push(location);
    }
    if (maxAttendees !== undefined) {
      updates.push(`max_attendees = $${paramIndex++}`);
      params.push(maxAttendees);
    }
    if (isPublic !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      params.push(isPublic);
    }
    if (coverImage !== undefined) {
      updates.push(`cover_image = $${paramIndex++}`);
      params.push(coverImage);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(eventId);

    await pool.query(
      `UPDATE server_events SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
      params
    );

    const result = await pool.query(
      'SELECT * FROM server_events WHERE id = $1',
      [eventId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check ownership/permissions
    const eventCheck = await pool.query(
      `SELECT se.*, sm.role 
       FROM server_events se
       LEFT JOIN server_members sm ON se.server_id = sm.server_id
       WHERE se.id = $1 AND sm.user_id = $2`,
      [eventId, userId]
    );

    if (eventCheck.rows.length === 0 || eventCheck.rows[0].role === 'member') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await pool.query('DELETE FROM server_events WHERE id = $1', [eventId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
