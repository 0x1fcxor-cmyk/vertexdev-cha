import express from 'express';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Get user accessibility settings
router.get('/settings', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      `SELECT 
        theme,
        font_size,
        high_contrast,
        screen_reader,
        reduced_motion,
        text_to_speech,
        closed_captions
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Extract accessibility settings from user record
    const settings = {
      theme: result.rows[0].theme || 'dark',
      fontSize: result.rows[0].font_size || 'medium',
      highContrast: result.rows[0].high_contrast || false,
      screenReader: result.rows[0].screen_reader || false,
      reducedMotion: result.rows[0].reduced_motion || false,
      textToSpeech: result.rows[0].text_to_speech || false,
      closedCaptions: result.rows[0].closed_captions || false
    };

    res.json(settings);
  } catch (error) {
    console.error('Get accessibility settings error:', error);
    res.status(500).json({ error: 'Failed to get accessibility settings' });
  }
});

// Update accessibility settings
router.put('/settings', async (req, res) => {
  try {
    const { theme, fontSize, highContrast, screenReader, reducedMotion, textToSpeech, closedCaptions } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (theme !== undefined) {
      updates.push(`theme = $${paramIndex++}`);
      params.push(theme);
    }
    if (fontSize !== undefined) {
      updates.push(`font_size = $${paramIndex++}`);
      params.push(fontSize);
    }
    if (highContrast !== undefined) {
      updates.push(`high_contrast = $${paramIndex++}`);
      params.push(highContrast);
    }
    if (screenReader !== undefined) {
      updates.push(`screen_reader = $${paramIndex++}`);
      params.push(screenReader);
    }
    if (reducedMotion !== undefined) {
      updates.push(`reduced_motion = $${paramIndex++}`);
      params.push(reducedMotion);
    }
    if (textToSpeech !== undefined) {
      updates.push(`text_to_speech = $${paramIndex++}`);
      params.push(textToSpeech);
    }
    if (closedCaptions !== undefined) {
      updates.push(`closed_captions = $${paramIndex++}`);
      params.push(closedCaptions);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(userId);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
      params
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update accessibility settings error:', error);
    res.status(500).json({ error: 'Failed to update accessibility settings' });
  }
});

// Get available accessibility options
router.get('/options', (req, res) => {
  const options = {
    themes: [
      { id: 'dark', name: 'Dark Mode', description: 'Default dark theme' },
      { id: 'midnight', name: 'Midnight', description: 'Darker theme for low light' },
      { id: 'light', name: 'Light Mode', description: 'Light theme for high visibility' },
      { id: 'high-contrast', name: 'High Contrast', description: 'Maximum contrast for visibility' }
    ],
    fontSizes: [
      { id: 'small', name: 'Small', scale: 0.85 },
      { id: 'medium', name: 'Medium', scale: 1.0 },
      { id: 'large', name: 'Large', scale: 1.15 },
      { id: 'extra-large', name: 'Extra Large', scale: 1.3 }
    ],
    features: [
      {
        id: 'high_contrast',
        name: 'High Contrast',
        description: 'Increase contrast for better visibility'
      },
      {
        id: 'screen_reader',
        name: 'Screen Reader Support',
        description: 'Optimize for screen readers with ARIA labels'
      },
      {
        id: 'reduced_motion',
        name: 'Reduced Motion',
        description: 'Minimize animations for users with motion sensitivity'
      },
      {
        id: 'text_to_speech',
        name: 'Text-to-Speech',
        description: 'Read messages aloud'
      },
      {
        id: 'closed_captions',
        name: 'Closed Captions',
        description: 'Display captions for voice and video content'
      }
    ]
  };

  res.json(options);
});

// Generate accessible message content
router.post('/message/accessible', async (req, res) => {
  try {
    const { content, settings } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    let accessibleContent = content;

    // Add ARIA labels for images
    accessibleContent = accessibleContent.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" aria-label="$1" role="img" />'
    );

    // Add proper heading structure
    accessibleContent = accessibleContent.replace(
      /^(#{1,6})\s+(.+)$/gm,
      (match, hashes, text) => {
        const level = hashes.length;
        return `<h${level} aria-level="${level}">${text}</h${level}>`;
      }
    );

    // Add aria-live for dynamic content
    accessibleContent = `<div aria-live="polite">${accessibleContent}</div>`;

    // Apply high contrast if enabled
    if (settings?.highContrast) {
      accessibleContent = accessibleContent.replace(
        /color:\s*[^;]+;/g,
        'color: #000000;'
      );
      accessibleContent = accessibleContent.replace(
        /background-color:\s*[^;]+;/g,
        'background-color: #FFFFFF;'
      );
    }

    res.json({ accessibleContent });
  } catch (error) {
    console.error('Generate accessible content error:', error);
    res.status(500).json({ error: 'Failed to generate accessible content' });
  }
});

export default router;
