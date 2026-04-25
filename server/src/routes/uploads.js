import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mp3|wav|pdf|doc|docx|txt|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Upload file
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Save file info to database
    const fileId = uuidv4();
    const fileRecord = {
      id: fileId,
      user_id: userId,
      original_name: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: `/uploads/${req.file.filename}`,
      created_at: new Date().toISOString()
    };

    await pool.query(
      `INSERT INTO uploads (id, user_id, original_name, filename, mimetype, size, path, url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [fileRecord.id, fileRecord.user_id, fileRecord.original_name, fileRecord.filename,
       fileRecord.mimetype, fileRecord.size, fileRecord.path, fileRecord.url, fileRecord.created_at]
    );

    res.json({
      id: fileId,
      url: fileRecord.url,
      name: fileRecord.original_name,
      size: fileRecord.size,
      type: fileRecord.mimetype
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Upload multiple files
router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const uploadedFiles = await Promise.all(req.files.map(async (file) => {
      const fileId = uuidv4();
      const fileRecord = {
        id: fileId,
        user_id: userId,
        original_name: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        url: `/uploads/${file.filename}`,
        created_at: new Date().toISOString()
      };

      await pool.query(
        `INSERT INTO uploads (id, user_id, original_name, filename, mimetype, size, path, url, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [fileRecord.id, fileRecord.user_id, fileRecord.original_name, fileRecord.filename,
         fileRecord.mimetype, fileRecord.size, fileRecord.path, fileRecord.url, fileRecord.created_at]
      );

      return {
        id: fileId,
        url: fileRecord.url,
        name: fileRecord.original_name,
        size: fileRecord.size,
        type: fileRecord.mimetype
      };
    }));

    res.json({ files: uploadedFiles });
  } catch (error) {
    console.error('Upload multiple error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Get file info
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM uploads WHERE id = $1',
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

// Delete file
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check if user owns the file
    const result = await pool.query(
      'SELECT * FROM uploads WHERE id = $1 AND user_id = $2',
      [fileId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found or unauthorized' });
    }

    // Delete from database
    await pool.query('DELETE FROM uploads WHERE id = $1', [fileId]);

    // TODO: Delete actual file from disk
    // fs.unlinkSync(result.rows[0].path);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
