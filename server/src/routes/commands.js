import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/connection.js';
import commands from '../commands/index.js';

const router = express.Router();

// Parse and execute slash command
router.post('/execute', async (req, res) => {
  try {
    const { command, args, channelId, userId, serverId } = req.body;

    if (!command || !command.startsWith('/')) {
      return res.status(400).json({ error: 'Invalid command format' });
    }

    const commandName = command.substring(1); // Remove the /
    const cmd = commands.get(commandName);

    if (!cmd) {
      return res.status(404).json({ error: 'Command not found' });
    }

    // Validate required arguments
    const missingArgs = cmd.args.filter(arg => arg.required && !args[arg.name]);
    if (missingArgs.length > 0) {
      return res.status(400).json({ 
        error: `Missing required arguments: ${missingArgs.map(a => a.name).join(', ')}` 
      });
    }

    // Execute command
    const context = {
      channelId,
      userId,
      serverId,
      timestamp: Date.now(),
      pool: getPool()
    };

    const result = await cmd.execute(args, context);

    // If command returns a message, send it
    if (result.type === 'message') {
      const messageId = uuidv4();
      await getPool().query(
        `INSERT INTO messages (id, channel_id, user_id, content, data, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [messageId, channelId, userId, result.content, JSON.stringify(result.data || {})]
      );
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error('Execute command error:', error);
    res.status(500).json({ error: 'Failed to execute command' });
  }
});

// Get all available commands
router.get('/', async (req, res) => {
  try {
    const commandList = Array.from(commands.entries()).map(([name, cmd]) => ({
      name,
      description: cmd.description,
      args: cmd.args
    }));

    res.json({ commands: commandList });
  } catch (error) {
    console.error('Get commands error:', error);
    res.status(500).json({ error: 'Failed to get commands' });
  }
});

// Get command info
router.get('/:commandName', async (req, res) => {
  try {
    const { commandName } = req.params;
    const cmd = commands.get(commandName);

    if (!cmd) {
      return res.status(404).json({ error: 'Command not found' });
    }

    res.json({
      name: cmd.name,
      description: cmd.description,
      args: cmd.args
    });
  } catch (error) {
    console.error('Get command error:', error);
    res.status(500).json({ error: 'Failed to get command' });
  }
});

export default router;
