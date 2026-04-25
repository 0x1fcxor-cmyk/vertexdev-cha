import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';

const router = express.Router();

// SDK documentation endpoint
router.get('/docs', (req, res) => {
  const docs = {
    version: '1.0.0',
    title: 'LightChat Bot SDK',
    baseUrl: 'https://api.lightchat.com',
    authentication: {
      type: 'Bot Token',
      header: 'Authorization',
      prefix: 'Bot',
      description: 'Include your bot token in the Authorization header with "Bot " prefix'
    },
    events: [
      {
        name: 'MESSAGE_CREATE',
        description: 'Fired when a message is created',
        payload: {
          id: 'uuid',
          content: 'string',
          author: { id: 'uuid', username: 'string' },
          channel_id: 'uuid',
          timestamp: 'ISO8601'
        }
      },
      {
        name: 'MESSAGE_UPDATE',
        description: 'Fired when a message is edited',
        payload: {
          id: 'uuid',
          content: 'string',
          edited_timestamp: 'ISO8601'
        }
      },
      {
        name: 'MESSAGE_DELETE',
        description: 'Fired when a message is deleted',
        payload: {
          id: 'uuid',
          channel_id: 'uuid'
        }
      },
      {
        name: 'GUILD_MEMBER_ADD',
        description: 'Fired when a user joins a server',
        payload: {
          guild_id: 'uuid',
          user: { id: 'uuid', username: 'string' }
        }
      },
      {
        name: 'GUILD_MEMBER_REMOVE',
        description: 'Fired when a user leaves a server',
        payload: {
          guild_id: 'uuid',
          user: { id: 'uuid', username: 'string' }
        }
      },
      {
        name: 'VOICE_STATE_UPDATE',
        description: 'Fired when a user joins/leaves a voice channel',
        payload: {
          user_id: 'uuid',
          channel_id: 'uuid',
          guild_id: 'uuid',
          muted: 'boolean',
          deafened: 'boolean'
        }
      }
    ],
    api: {
      messages: {
        create: {
          method: 'POST',
          path: '/channels/{channel.id}/messages',
          body: { content: 'string', embed: 'object', tts: 'boolean' }
        },
        edit: {
          method: 'PATCH',
          path: '/channels/{channel.id}/messages/{message.id}',
          body: { content: 'string', embed: 'object' }
        },
        delete: {
          method: 'DELETE',
          path: '/channels/{channel.id}/messages/{message.id}'
        },
        addReaction: {
          method: 'PUT',
          path: '/channels/{channel.id}/messages/{message.id}/reactions/{emoji}/@me'
        }
      },
      channels: {
        get: {
          method: 'GET',
          path: '/channels/{channel.id}'
        },
        create: {
          method: 'POST',
          path: '/guilds/{guild.id}/channels',
          body: { name: 'string', type: 'integer' }
        }
      },
      guilds: {
        get: {
          method: 'GET',
          path: '/guilds/{guild.id}'
        },
        getMembers: {
          method: 'GET',
          path: '/guilds/{guild.id}/members'
        }
      },
      users: {
        get: {
          method: 'GET',
          path: '/users/{user.id}'
        },
        getCurrentUser: {
          method: 'GET',
          path: '/users/@me'
        }
      }
    },
    examples: {
      javascript: `
const { LightChatBot } = require('@lightchat/sdk');

const bot = new LightChatBot({
  token: 'YOUR_BOT_TOKEN'
});

bot.on('message', async (message) => {
  if (message.content === '!ping') {
    await message.channel.send('Pong!');
  }
});

bot.login();
      `,
      python: `
import lightchat

bot = lightchat.Bot(token='YOUR_BOT_TOKEN')

@bot.event
async def on_message(message):
    if message.content == '!ping':
        await message.channel.send('Pong!')

bot.run()
      `,
      typescript: `
import { LightChatBot, Message } from '@lightchat/sdk';

const bot = new LightChatBot({
  token: 'YOUR_BOT_TOKEN'
});

bot.on('messageCreate', async (message: Message) => {
  if (message.content === '!ping') {
    await message.channel.send('Pong!');
  }
});

bot.login();
      `
    },
    libraries: {
      javascript: {
        npm: '@lightchat/sdk',
        github: 'lightchat/lightchat-sdk-js',
        documentation: 'https://docs.lightchat.com/js'
      },
      python: {
        pip: 'lightchat.py',
        github: 'lightchat/lightchat-sdk-py',
        documentation: 'https://docs.lightchat.com/python'
      },
      typescript: {
        npm: '@lightchat/sdk',
        github: 'lightchat/lightchat-sdk-ts',
        documentation: 'https://docs.lightchat.com/ts'
      }
    }
  };

  res.json(docs);
});

// Get bot SDK download links
router.get('/downloads', (req, res) => {
  const downloads = {
    javascript: {
      version: '1.0.0',
      npm: 'npm install @lightchat/sdk',
      cdn: 'https://cdn.lightchat.com/sdk/js/lightchat-sdk.min.js'
    },
    python: {
      version: '1.0.0',
      pip: 'pip install lightchat.py',
      pypi: 'https://pypi.org/project/lightchat.py/'
    },
    typescript: {
      version: '1.0.0',
      npm: 'npm install @lightchat/sdk',
      types: '@types/lightchat-sdk'
    },
    go: {
      version: '0.1.0',
      go: 'go get github.com/lightchat/sdk-go'
    }
  };

  res.json(downloads);
});

// Create bot application
router.post('/application', async (req, res) => {
  try {
    const { name, description, redirectUris } = req.body;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const appId = uuidv4();
    const clientSecret = crypto.randomBytes(32).toString('hex');

    await pool.query(
      `INSERT INTO bot_applications (id, user_id, name, description, client_secret, redirect_uris, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [appId, userId, name, description, clientSecret, redirectUris || []]
    );

    res.status(201).json({
      id: appId,
      name,
      clientSecret,
      message: 'Save this client secret securely. It will not be shown again.'
    });
  } catch (error) {
    console.error('Create bot application error:', error);
    res.status(500).json({ error: 'Failed to create bot application' });
  }
});

// Get user's bot applications
router.get('/applications', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const result = await pool.query(
      `SELECT id, name, description, redirect_uris, created_at 
       FROM bot_applications 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ applications: result.rows });
  } catch (error) {
    console.error('Get bot applications error:', error);
    res.status(500).json({ error: 'Failed to get bot applications' });
  }
});

// Reset bot client secret
router.post('/application/:appId/secret', async (req, res) => {
  try {
    const { appId } = req.params;
    const userId = req.headers['x-user-id'];
    const pool = getPool();

    const newSecret = crypto.randomBytes(32).toString('hex');

    await pool.query(
      `UPDATE bot_applications 
       SET client_secret = $1 
       WHERE id = $2 AND user_id = $3`,
      [newSecret, appId, userId]
    );

    res.json({ clientSecret: newSecret });
  } catch (error) {
    console.error('Reset secret error:', error);
    res.status(500).json({ error: 'Failed to reset client secret' });
  }
});

export default router;
