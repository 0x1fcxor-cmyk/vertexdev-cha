import express from 'express';
import { getPool } from '../database/connection.js';

const router = express.Router();

// Translate message
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // In a real implementation, you would use a translation API like Google Translate, DeepL, or Microsoft Translator
    // For now, we'll simulate translation
    
    // Check if translation is cached
    const cacheResult = await pool.query(
      `SELECT translated_text FROM translation_cache 
       WHERE original_text = $1 AND target_language = $2 
       AND created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'`,
      [text, targetLanguage]
    );

    if (cacheResult.rows.length > 0) {
      return res.json({ translatedText: cacheResult.rows[0].translated_text, cached: true });
    }

    // Simulate translation (in production, use actual translation API)
    const translatedText = `[Translated to ${targetLanguage}] ${text}`;

    // Cache the translation
    await pool.query(
      `INSERT INTO translation_cache (original_text, translated_text, source_language, target_language, user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [text, translatedText, sourceLanguage || 'auto', targetLanguage, userId]
    );

    res.json({ translatedText, cached: false });
  } catch (error) {
    console.error('Translate error:', error);
    res.status(500).json({ error: 'Failed to translate message' });
  }
});

// Get supported languages
router.get('/languages', (req, res) => {
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
    { code: 'pl', name: 'Polish', nativeName: 'Polski' },
    { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
    { code: 'da', name: 'Danish', nativeName: 'Dansk' },
    { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
    { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
    { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
    { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
    { code: 'th', name: 'Thai', nativeName: 'ไทย' },
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
    { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
    { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
    { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
    { code: 'ro', name: 'Romanian', nativeName: 'Română' },
    { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' }
  ];

  res.json({ languages });
});

// Auto-translate channel setting
router.post('/channel/:channelId/auto-translate', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { enabled, targetLanguage } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    // Check permissions
    const permissionCheck = await pool.query(
      `SELECT c.server_id 
       FROM channels c
       LEFT JOIN server_members sm ON c.server_id = sm.server_id
       WHERE c.id = $1 AND sm.user_id = $2 AND (sm.role = 'admin' OR sm.role = 'moderator')`,
      [channelId, userId]
    );

    if (permissionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await pool.query(
      `INSERT INTO channel_translation_settings (channel_id, auto_translate, target_language, enabled_by, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (channel_id) DO UPDATE SET auto_translate = $2, target_language = $3, enabled_by = $4`,
      [channelId, enabled, targetLanguage, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Auto-translate setting error:', error);
    res.status(500).json({ error: 'Failed to update auto-translate setting' });
  }
});

// Get channel translation settings
router.get('/channel/:channelId/settings', async (req, res) => {
  try {
    const { channelId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM channel_translation_settings WHERE channel_id = $1',
      [channelId]
    );

    if (result.rows.length === 0) {
      return res.json({ autoTranslate: false, targetLanguage: 'en' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get translation settings error:', error);
    res.status(500).json({ error: 'Failed to get translation settings' });
  }
});

// Get user's translation preferences
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM user_translation_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ autoTranslate: false, targetLanguage: 'en', sourceLanguage: 'auto' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get translation preferences error:', error);
    res.status(500).json({ error: 'Failed to get translation preferences' });
  }
});

// Update user's translation preferences
router.put('/preferences', async (req, res) => {
  try {
    const { autoTranslate, targetLanguage, sourceLanguage } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    await pool.query(
      `INSERT INTO user_translation_preferences (user_id, auto_translate, target_language, source_language, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET auto_translate = $2, target_language = $3, source_language = $4, updated_at = CURRENT_TIMESTAMP`,
      [userId, autoTranslate || false, targetLanguage || 'en', sourceLanguage || 'auto']
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update translation preferences error:', error);
    res.status(500).json({ error: 'Failed to update translation preferences' });
  }
});

export default router;
