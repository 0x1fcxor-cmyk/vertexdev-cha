import { useStore } from '../store/useStore';
import ContextMenu from './ContextMenu';
import { useContextMenu } from '../hooks/useContextMenu';

export default function UserList() {
  const { onlineUsers, currentServer, user } = useStore();
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

  const getInitials = (username) => {
    return username?.substring(0, 2).toUpperCase() || '??';
  };

  const getAvatarColor = (userId) => {
    const colors = ['#22c55e', '#16a34a', '#4ade80', '#15803d', '#166534', '#14532d'];
    const index = userId?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index] || colors[0];
  };

  const handleUserContextMenu = (e, targetUser) => {
    const isSelf = targetUser.id === user?.id;
    const items = [
      { label: 'View Profile', icon: '👤', action: () => console.log('View profile') },
      { label: 'Send Message', icon: '💬', action: () => console.log('Send message') },
      { divider: true },
      { label: 'Mention', icon: '@', action: () => console.log('Mention user') },
      { label: 'Add Friend', icon: '➕', action: () => console.log('Add friend') },
      { divider: true },
      { label: 'Copy User ID', icon: '📋', action: () => navigator.clipboard.writeText(targetUser.id) },
    ];

    if (!isSelf) {
      items.push(
        { divider: true },
        { label: 'Block', icon: '🚫', action: () => console.log('Block user'), danger: true }
      );
    }

    showContextMenu(e, items);
  };

  return (
    <div className="w-60 bg-tertiary flex flex-col">
      <div className="h-12 px-4 flex items-center border-b border-light">
        <span className="font-bold text-primary">Members</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-xs font-bold text-secondary px-2 py-2">
          ONLINE — {onlineUsers.length}
        </div>

        {onlineUsers.map((onlineUser) => (
          <div
            key={onlineUser.id}
            onContextMenu={(e) => handleUserContextMenu(e, onlineUser)}
            className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-hover cursor-pointer interactive"
          >
            <div className="relative">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: getAvatarColor(onlineUser.id) }}
              >
                {getInitials(onlineUser.username)}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-tertiary" />
            </div>
            <span className="text-primary truncate">{onlineUser.username}</span>
          </div>
        ))}

        {onlineUsers.length === 0 && (
          <div className="text-secondary text-sm px-2 py-4">
            No users online
          </div>
        )}
      </div>

      {/* Context Menu */}
      <ContextMenu
        items={contextMenu.items}
        position={{ x: contextMenu.x, y: contextMenu.y }}
        visible={contextMenu.visible}
        onClose={hideContextMenu}
      />
    </div>
  );
}
