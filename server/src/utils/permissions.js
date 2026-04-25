// Permission bitmasks for role-based access control
export const Permissions = {
  // General Server Permissions
  CREATE_INSTANT_INVITE: 1 << 0,
  KICK_MEMBERS: 1 << 1,
  BAN_MEMBERS: 1 << 2,
  ADMINISTRATOR: 1 << 3,
  CHANGE_NICKNAME: 1 << 4,
  MANAGE_NICKNAMES: 1 << 5,
  MANAGE_ROLES: 1 << 6,
  MANAGE_CHANNELS: 1 << 7,
  MANAGE_SERVER: 1 << 8,
  VIEW_AUDIT_LOG: 1 << 19,
  VIEW_GUILD_INSIGHTS: 1 << 28,
  
  // Text Channel Permissions
  SEND_MESSAGES: 1 << 10,
  SEND_TTS_MESSAGES: 1 << 11,
  MANAGE_MESSAGES: 1 << 12,
  EMBED_LINKS: 1 << 13,
  ATTACH_FILES: 1 << 14,
  ADD_REACTIONS: 1 << 15,
  READ_MESSAGE_HISTORY: 1 << 16,
  MENTION_EVERYONE: 1 << 17,
  USE_EXTERNAL_EMOJIS: 1 << 18,
  
  // Voice Channel Permissions
  CONNECT: 1 << 20,
  SPEAK: 1 << 21,
  MUTE_MEMBERS: 1 << 22,
  DEAFEN_MEMBERS: 1 << 23,
  MOVE_MEMBERS: 1 << 24,
  USE_VAD: 1 << 26,
  PRIORITY_SPEAKER: 1 << 27,
  STREAM: 1 << 29,
  
  // All Permissions
  ALL: 0xFFFFFFFF
};

export function hasPermission(userPermissions, permission) {
  // Administrator bypasses all permission checks
  if (userPermissions & Permissions.ADMINISTRATOR) {
    return true;
  }
  
  return (userPermissions & permission) === permission;
}

export function calculatePermissions(roles) {
  let permissions = 0;
  
  for (const role of roles) {
    permissions |= role.permissions;
  }
  
  return permissions;
}

export function getDefaultPermissions() {
  return (
    Permissions.VIEW_CHANNEL |
    Permissions.READ_MESSAGE_HISTORY |
    Permissions.CREATE_INSTANT_INVITE |
    Permissions.CHANGE_NICKNAME |
    Permissions.CONNECT |
    Permissions.SPEAK |
    Permissions.ADD_REACTIONS |
    Permissions.EMBED_LINKS |
    Permissions.ATTACH_FILES |
    Permissions.USE_EXTERNAL_EMOJIS
  );
}
