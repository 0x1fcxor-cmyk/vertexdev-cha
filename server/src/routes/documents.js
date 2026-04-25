import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';
import { initRedis } from '../redis/client.js';

const router = express.Router();

// Simple OT (Operational Transformation) implementation
class OTEngine {
  constructor() {
    this.documents = new Map();
  }

  applyOperation(docId, operation) {
    const doc = this.documents.get(docId);
    if (!doc) return null;

    // Simple character-based OT
    switch (operation.type) {
      case 'insert':
        doc.content = doc.content.slice(0, operation.position) + operation.text + doc.content.slice(operation.position);
        doc.version++;
        break;
      case 'delete':
        doc.content = doc.content.slice(0, operation.position) + doc.content.slice(operation.position + operation.length);
        doc.version++;
        break;
      case 'retain':
        // No change, just move cursor
        break;
    }

    this.documents.set(docId, doc);
    return doc;
  }

  transform(operation, otherOperation) {
    // Transform operation against another operation (simplified)
    // In a real implementation, this would handle concurrent edits
    if (otherOperation.type === 'insert') {
      if (operation.position >= otherOperation.position) {
        operation.position += otherOperation.text.length;
      }
    } else if (otherOperation.type === 'delete') {
      if (operation.position > otherOperation.position) {
        operation.position -= otherOperation.length;
      }
    }
    return operation;
  }
}

const otEngine = new OTEngine();

// Create new document
router.post('/', async (req, res) => {
  try {
    const { title, content, serverId, channelId } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const docId = uuidv4();

    await pool.query(
      `INSERT INTO documents (id, title, content, created_by, server_id, channel_id, version, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 1, CURRENT_TIMESTAMP)`,
      [docId, title, content || '', userId, serverId || null, channelId || null]
    );

    // Store in OT engine
    otEngine.documents.set(docId, { content: content || '', version: 1 });

    const result = await pool.query(
      'SELECT * FROM documents WHERE id = $1',
      [docId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Get document
router.get('/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM documents WHERE id = $1',
      [docId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

// Apply operation (OT)
router.post('/:docId/operation', async (req, res) => {
  try {
    const { docId } = req.params;
    const { operation, clientVersion } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Get current document state
    const docResult = await pool.query(
      'SELECT * FROM documents WHERE id = $1',
      [docId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = docResult.rows[0];
    const serverVersion = doc.version;

    // Transform operation if versions don't match
    let transformedOperation = operation;
    if (clientVersion !== serverVersion) {
      // In a real implementation, we'd fetch operations between versions and transform
      // For now, just apply the operation
    }

    // Apply operation
    const updatedDoc = otEngine.applyOperation(docId, transformedOperation);

    if (!updatedDoc) {
      return res.status(500).json({ error: 'Failed to apply operation' });
    }

    // Update database
    await pool.query(
      `UPDATE documents 
       SET content = $1, version = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [updatedDoc.content, updatedDoc.version, docId]
    );

    // Emit operation to other clients via Socket.io
    const io = req.app.get('io');
    io.to(`document:${docId}`).emit('document:operation', {
      docId,
      operation: transformedOperation,
      version: updatedDoc.version,
      userId
    });

    res.json({ success: true, version: updatedDoc.version });
  } catch (error) {
    console.error('Apply operation error:', error);
    res.status(500).json({ error: 'Failed to apply operation' });
  }
});

// Get documents for server/channel
router.get('/', async (req, res) => {
  try {
    const { serverId, channelId } = req.query;
    const pool = getPool();

    let sql = 'SELECT * FROM documents';
    const params = [];
    let conditions = [];

    if (serverId) {
      conditions.push('server_id = $' + (params.length + 1));
      params.push(serverId);
    }

    if (channelId) {
      conditions.push('channel_id = $' + (params.length + 1));
      params.push(channelId);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY updated_at DESC';

    const result = await pool.query(sql, params);

    res.json({ documents: result.rows });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// Update document metadata
router.put('/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    const { title } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `UPDATE documents 
       SET title = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND created_by = $3`,
      [title, docId, userId]
    );

    const result = await pool.query(
      'SELECT * FROM documents WHERE id = $1',
      [docId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
router.delete('/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      'DELETE FROM documents WHERE id = $1 AND created_by = $2',
      [docId, userId]
    );

    // Remove from OT engine
    otEngine.documents.delete(docId);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Get document collaborators
router.get('/:docId/collaborators', async (req, res) => {
  try {
    const { docId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      `SELECT DISTINCT u.id, u.username, u.avatar_url, u.status
       FROM document_collaborators dc
       LEFT JOIN users u ON dc.user_id = u.id
       WHERE dc.document_id = $1
       AND dc.last_active >= CURRENT_TIMESTAMP - INTERVAL '5 minutes'`,
      [docId]
    );

    res.json({ collaborators: result.rows });
  } catch (error) {
    console.error('Get collaborators error:', error);
    res.status(500).json({ error: 'Failed to get collaborators' });
  }
});

// Join document collaboration
router.post('/:docId/join', async (req, res) => {
  try {
    const { docId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `INSERT INTO document_collaborators (document_id, user_id, joined_at, last_active)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (document_id, user_id) 
       DO UPDATE SET last_active = CURRENT_TIMESTAMP`,
      [docId, userId]
    );

    // Emit to other collaborators
    const io = req.app.get('io');
    io.to(`document:${docId}`).emit('document:user_joined', { userId, docId });

    res.json({ success: true });
  } catch (error) {
    console.error('Join document error:', error);
    res.status(500).json({ error: 'Failed to join document' });
  }
});

// Leave document collaboration
router.post('/:docId/leave', async (req, res) => {
  try {
    const { docId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `DELETE FROM document_collaborators 
       WHERE document_id = $1 AND user_id = $2`,
      [docId, userId]
    );

    // Emit to other collaborators
    const io = req.app.get('io');
    io.to(`document:${docId}`).emit('document:user_left', { userId, docId });

    res.json({ success: true });
  } catch (error) {
    console.error('Leave document error:', error);
    res.status(500).json({ error: 'Failed to leave document' });
  }
});

export default router;
