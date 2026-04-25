// Built-in slash commands registry
export const commands = new Map();

// Command format: {
//   name: string,
//   description: string,
//   args: [{ name, description, required, type }],
//   execute: (args, context) => Promise<result>
// }

// Register built-in commands

commands.set('help', {
  name: 'help',
  description: 'Show all available commands',
  args: [],
  execute: async (args, context) => {
    const commandList = Array.from(commands.entries())
      .map(([name, cmd]) => `/${name} - ${cmd.description}`)
      .join('\n');
    
    return {
      type: 'message',
      content: `**Available Commands:**\n${commandList}`
    };
  }
});

commands.set('ping', {
  name: 'ping',
  description: 'Check bot latency',
  args: [],
  execute: async (args, context) => {
    const latency = Date.now() - context.timestamp;
    return {
      type: 'message',
      content: `🏓 Pong! Latency: ${latency}ms`
    };
  }
});

commands.set('clear', {
  name: 'clear',
  description: 'Clear messages in the channel',
  args: [
    {
      name: 'amount',
      description: 'Number of messages to clear (1-100)',
      required: true,
      type: 'number'
    }
  ],
  execute: async (args, context) => {
    const amount = Math.min(Math.max(parseInt(args.amount) || 1, 1), 100);
    const { channelId, pool } = context;
    
    // Delete messages
    await pool.query(
      `DELETE FROM messages 
       WHERE channel_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [channelId, amount]
    );
    
    return {
      type: 'message',
      content: `🧹 Cleared ${amount} messages`
    };
  }
});

commands.set('kick', {
  name: 'kick',
  description: 'Kick a user from the server',
  args: [
    {
      name: 'user',
      description: 'User to kick',
      required: true,
      type: 'user'
    },
    {
      name: 'reason',
      description: 'Reason for kicking',
      required: false,
      type: 'string'
    }
  ],
  execute: async (args, context) => {
    const { userId, serverId, pool } = context;
    
    // Check if user has permission
    // TODO: Implement permission check
    
    // Remove from server
    await pool.query(
      'DELETE FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, args.user]
    );
    
    return {
      type: 'message',
      content: `👢 User kicked ${args.reason ? `for: ${args.reason}` : ''}`
    };
  }
});

commands.set('ban', {
  name: 'ban',
  description: 'Ban a user from the server',
  args: [
    {
      name: 'user',
      description: 'User to ban',
      required: true,
      type: 'user'
    },
    {
      name: 'reason',
      description: 'Reason for banning',
      required: false,
      type: 'string'
    },
    {
      name: 'days',
      description: 'Delete messages from X days ago',
      required: false,
      type: 'number'
    }
  ],
  execute: async (args, context) => {
    const { userId, serverId, pool } = context;
    
    // Check if user has permission
    // TODO: Implement permission check
    
    // Ban user
    await pool.query(
      'UPDATE users SET status = $1 WHERE id = $2',
      ['banned', args.user]
    );
    
    // Remove from server
    await pool.query(
      'DELETE FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, args.user]
    );
    
    return {
      type: 'message',
      content: `🔨 User banned ${args.reason ? `for: ${args.reason}` : ''}`
    };
  }
});

commands.set('mute', {
  name: 'mute',
  description: 'Mute a user in the server',
  args: [
    {
      name: 'user',
      description: 'User to mute',
      required: true,
      type: 'user'
    },
    {
      name: 'duration',
      description: 'Duration in minutes',
      required: false,
      type: 'number'
    },
    {
      name: 'reason',
      description: 'Reason for muting',
      required: false,
      type: 'string'
    }
  ],
  execute: async (args, context) => {
    const { userId, serverId, pool } = context;
    
    await pool.query(
      `UPDATE server_members 
       SET muted = TRUE 
       WHERE server_id = $1 AND user_id = $2`,
      [serverId, args.user]
    );
    
    return {
      type: 'message',
      content: `🔇 User muted ${args.duration ? `for ${args.duration} minutes` : ''} ${args.reason ? `for: ${args.reason}` : ''}`
    };
  }
});

commands.set('unmute', {
  name: 'unmute',
  description: 'Unmute a user',
  args: [
    {
      name: 'user',
      description: 'User to unmute',
      required: true,
      type: 'user'
    }
  ],
  execute: async (args, context) => {
    const { userId, serverId, pool } = context;
    
    await pool.query(
      `UPDATE server_members 
       SET muted = FALSE 
       WHERE server_id = $1 AND user_id = $2`,
      [serverId, args.user]
    );
    
    return {
      type: 'message',
      content: '🔊 User unmuted'
    };
  }
});

commands.set('announce', {
  name: 'announce',
  description: 'Send an announcement message',
  args: [
    {
      name: 'title',
      description: 'Announcement title',
      required: true,
      type: 'string'
    },
    {
      name: 'message',
      description: 'Announcement message',
      required: true,
      type: 'string'
    }
  ],
  execute: async (args, context) => {
    const { channelId, userId, pool } = context;
    
    const announcement = `📢 **${args.title}**\n\n${args.message}`;
    
    await pool.query(
      `INSERT INTO messages (id, channel_id, user_id, content, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, CURRENT_TIMESTAMP)`,
      [channelId, userId, announcement]
    );
    
    return {
      type: 'message',
      content: '📢 Announcement sent!'
    };
  }
});

commands.set('poll', {
  name: 'poll',
  description: 'Create a poll',
  args: [
    {
      name: 'question',
      description: 'Poll question',
      required: true,
      type: 'string'
    },
    {
      name: 'options',
      description: 'Poll options (comma-separated)',
      required: true,
      type: 'string'
    }
  ],
  execute: async (args, context) => {
    const options = args.options.split(',').map(opt => opt.trim());
    const pollId = Date.now();
    
    let pollContent = `📊 **${args.question}**\n\n`;
    options.forEach((opt, i) => {
      const emoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][i];
      pollContent += `${emoji} ${opt}\n`;
    });
    pollContent += `\n*Poll ID: ${pollId}*\n*React with emojis to vote!*`;
    
    return {
      type: 'message',
      content: pollContent,
      data: { type: 'poll', pollId, options }
    };
  }
});

commands.set(' userinfo', {
  name: 'userinfo',
  description: 'Get information about a user',
  args: [
    {
      name: 'user',
      description: 'User to get info about',
      required: false,
      type: 'user'
    }
  ],
  execute: async (args, context) => {
    const { userId, pool } = context;
    const targetUserId = args.user || userId;
    
    const result = await pool.query(
      `SELECT id, username, email, avatar_url, status, created_at 
       FROM users WHERE id = $1`,
      [targetUserId]
    );
    
    if (result.rows.length === 0) {
      return {
        type: 'message',
        content: '❌ User not found'
      };
    }
    
    const user = result.rows[0];
    const memberCount = await pool.query(
      `SELECT COUNT(*) as count FROM server_members WHERE user_id = $1`,
      [targetUserId]
    );
    
    return {
      type: 'message',
      content: `👤 **User Info**
**Username:** ${user.username}
**Status:** ${user.status}
**Member of:** ${memberCount.rows[0].count} servers
**Joined:** ${new Date(user.created_at).toLocaleDateString()}`
    };
  }
});

commands.set('serverinfo', {
  name: 'serverinfo',
  description: 'Get information about the server',
  args: [],
  execute: async (args, context) => {
    const { serverId, pool } = context;
    
    const result = await pool.query(
      `SELECT * FROM servers WHERE id = $1`,
      [serverId]
    );
    
    if (result.rows.length === 0) {
      return {
        type: 'message',
        content: '❌ Server not found'
      };
    }
    
    const server = result.rows[0];
    const channelCount = await pool.query(
      `SELECT COUNT(*) as count FROM channels WHERE server_id = $1`,
      [serverId]
    );
    
    return {
      type: 'message',
      content: `🏠 **Server Info**
**Name:** ${server.name}
**Members:** ${server.member_count}
**Channels:** ${channelCount.rows[0].count}
**Created:** ${new Date(server.created_at).toLocaleDateString()}`
    };
  }
});

commands.set('role', {
  name: 'role',
  description: 'Manage server roles',
  args: [
    {
      name: 'action',
      description: 'Action: create, delete, list',
      required: true,
      type: 'string'
    },
    {
      name: 'name',
      description: 'Role name',
      required: false,
      type: 'string'
    },
    {
      name: 'color',
      description: 'Role color (hex)',
      required: false,
      type: 'string'
    }
  ],
  execute: async (args, context) => {
    const { serverId, pool } = context;
    
    if (args.action === 'list') {
      const result = await pool.query(
        'SELECT * FROM roles WHERE server_id = $1 ORDER BY position',
        [serverId]
      );
      
      let content = '🎭 **Server Roles**\n\n';
      result.rows.forEach(role => {
        content += `${role.color ? `🎨 ${role.color}` : ''} **${role.name}**\n`;
      });
      
      return { type: 'message', content };
    }
    
    if (args.action === 'create' && args.name) {
      const roleId = await pool.query(
        `INSERT INTO roles (id, server_id, name, color, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, CURRENT_TIMESTAMP)
         RETURNING id`,
        [serverId, args.name, args.color || null]
      );
      
      return {
        type: 'message',
        content: `✅ Created role: **${args.name}**`
      };
    }
    
    if (args.action === 'delete' && args.name) {
      await pool.query(
        'DELETE FROM roles WHERE server_id = $1 AND name = $2',
        [serverId, args.name]
      );
      
      return {
        type: 'message',
        content: `🗑️ Deleted role: **${args.name}**`
      };
    }
    
    return {
      type: 'message',
      content: '❌ Invalid action. Use: create, delete, or list'
    };
  }
});

commands.set('slowmode', {
  name: 'slowmode',
  description: 'Set slow mode for the channel',
  args: [
    {
      name: 'seconds',
      description: 'Seconds between messages (0 to disable)',
      required: true,
      type: 'number'
    }
  ],
  execute: async (args, context) => {
    const { channelId, pool } = context;
    const seconds = Math.max(0, Math.min(21600, parseInt(args.seconds))); // Max 6 hours
    
    await pool.query(
      'UPDATE channels SET slowmode_delay = $1 WHERE id = $2',
      [seconds, channelId]
    );
    
    return {
      type: 'message',
      content: seconds === 0 
        ? '⏱️ Slow mode disabled' 
        : `⏱️ Slow mode set to ${seconds} seconds`
    };
  }
});

commands.set('nick', {
  name: 'nick',
  description: 'Change your nickname',
  args: [
    {
      name: 'nickname',
      description: 'New nickname',
      required: true,
      type: 'string'
    }
  ],
  execute: async (args, context) => {
    const { userId, serverId, pool } = context;
    
    await pool.query(
      `UPDATE server_members 
       SET nickname = $1 
       WHERE server_id = $2 AND user_id = $3`,
      [args.nickname, serverId, userId]
    );
    
    return {
      type: 'message',
      content: `✅ Nickname changed to: **${args.nickname}**`
    };
  }
});

commands.set('avatar', {
  name: 'avatar',
  description: 'Change your avatar URL',
  args: [
    {
      name: 'url',
      description: 'Avatar image URL',
      required: true,
      type: 'string'
    }
  ],
  execute: async (args, context) => {
    const { userId, pool } = context;
    
    await pool.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2',
      [args.url, userId]
    );
    
    return {
      type: 'message',
      content: '✅ Avatar updated!'
    };
  }
});

commands.set('status', {
  name: 'status',
  description: 'Set your status',
  args: [
    {
      name: 'status',
      description: 'Status: online, idle, dnd, invisible',
      required: true,
      type: 'string'
    }
  ],
  execute: async (args, context) => {
    const { userId, pool } = context;
    const validStatuses = ['online', 'idle', 'dnd', 'invisible', 'offline'];
    
    if (!validStatuses.includes(args.status)) {
      return {
        type: 'message',
        content: '❌ Invalid status. Use: online, idle, dnd, invisible, or offline'
      };
    }
    
    await pool.query(
      'UPDATE users SET status = $1 WHERE id = $2',
      [args.status, userId]
    );
    
    return {
      type: 'message',
      content: `✅ Status set to: **${args.status}**`
    };
  }
});

commands.set('activity', {
  name: 'activity',
  description: 'Set your activity status',
  args: [
    {
      name: 'type',
      description: 'Activity type: playing, listening, watching, streaming',
      required: true,
      type: 'string'
    },
    {
      name: 'name',
      description: 'Activity name',
      required: true,
      type: 'string'
    }
  ],
  execute: async (args, context) => {
    const { userId, pool } = context;
    const validTypes = ['playing', 'listening', 'watching', 'streaming'];
    
    if (!validTypes.includes(args.type)) {
      return {
        type: 'message',
        content: '❌ Invalid type. Use: playing, listening, watching, or streaming'
      };
    }
    
    await pool.query(
      `UPDATE users 
       SET activity_type = $1, activity_name = $2 
       WHERE id = $3`,
      [args.type, args.name, userId]
    );
    
    return {
      type: 'message',
      content: `✅ Activity set: **${args.type} ${args.name}**`
    };
  }
});

// Export command registry
export default commands;
