import express from 'express';
import OpenAI from 'openai';
import { getPool } from '../database/connection.js';

const router = express.Router();
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Generate embedding for text
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Generate embedding error:', error);
    return null;
  }
}

// Calculate cosine similarity between two embeddings
function cosineSimilarity(a, b) {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Semantic search across messages
router.post('/semantic', async (req, res) => {
  try {
    const { query, serverId, limit = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const pool = getPool();

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) {
      return res.status(500).json({ error: 'Failed to generate embedding' });
    }

    // Get messages from server
    let sql = `
      SELECT m.id, m.content, m.created_at, c.name as channel_name, u.username
      FROM messages m
      LEFT JOIN channels c ON m.channel_id = c.id
      LEFT JOIN users u ON m.user_id = u.id
    `;
    const params = [];

    if (serverId) {
      sql += ' WHERE c.server_id = $1';
      params.push(serverId);
    }

    sql += ' ORDER BY m.created_at DESC LIMIT 100';

    const messagesResult = await pool.query(sql, params);
    const messages = messagesResult.rows;

    // Calculate similarity for each message
    const results = [];
    for (const message of messages) {
      const messageEmbedding = await generateEmbedding(message.content);
      if (messageEmbedding) {
        const similarity = cosineSimilarity(queryEmbedding, messageEmbedding);
        if (similarity > 0.7) { // Only return highly similar results
          results.push({
            ...message,
            similarity
          });
        }
      }
    }

    // Sort by similarity and limit
    results.sort((a, b) => b.similarity - a.similarity);
    const limitedResults = results.slice(0, limit);

    res.json({ results: limitedResults });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ error: 'Failed to perform semantic search' });
  }
});

// Full-text search
router.post('/fulltext', async (req, res) => {
  try {
    const { query, serverId, channelId, limit = 20 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const pool = getPool();

    let sql = `
      SELECT m.id, m.content, m.created_at, c.name as channel_name, u.username,
             ts_rank(to_tsvector('english', m.content), to_tsquery('english', $1)) as rank
      FROM messages m
      LEFT JOIN channels c ON m.channel_id = c.id
      LEFT JOIN users u ON m.user_id = u.id
      WHERE to_tsvector('english', m.content) @@ to_tsquery('english', $1)
    `;
    const params = [query];

    if (serverId) {
      sql += ' AND c.server_id = $' + (params.length + 1);
      params.push(serverId);
    }

    if (channelId) {
      sql += ' AND m.channel_id = $' + (params.length + 1);
      params.push(channelId);
    }

    sql += ' ORDER BY rank DESC, m.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await pool.query(sql, params);

    res.json({ results: result.rows });
  } catch (error) {
    console.error('Full-text search error:', error);
    res.status(500).json({ error: 'Failed to perform full-text search' });
  }
});

// AI-powered search suggestions
router.post('/suggestions', async (req, res) => {
  try {
    const { partialQuery, context = {} } = req.body;
    
    if (!partialQuery) {
      return res.status(400).json({ error: 'Partial query is required' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a search suggestion assistant. Given a partial search query, suggest 5 complete search queries that the user might be looking for. Return only the suggestions, one per line.' },
        { role: 'user', content: `Suggest search queries for: "${partialQuery}"` }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    const suggestions = completion.choices[0].message.content
      .split('\n')
      .filter(s => s.trim())
      .slice(0, 5);

    res.json({ suggestions });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({ error: 'Failed to get search suggestions' });
  }
});

// Search users
router.get('/users', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    const pool = getPool();

    if (!q) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await pool.query(
      `SELECT id, username, avatar_url, status 
       FROM users 
       WHERE username ILIKE $1 OR bio ILIKE $1
       LIMIT $2`,
      [`%${q}%`, limit]
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Search servers
router.get('/servers', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    const pool = getPool();

    if (!q) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await pool.query(
      `SELECT s.id, s.name, s.icon_url, s.description, s.member_count
       FROM servers s
       WHERE s.name ILIKE $1 OR s.description ILIKE $1
       AND s.public = TRUE
       LIMIT $2`,
      [`%${q}%`, limit]
    );

    res.json({ servers: result.rows });
  } catch (error) {
    console.error('Search servers error:', error);
    res.status(500).json({ error: 'Failed to search servers' });
  }
});

export default router;
