import { useStore } from '../store/useStore';
import ContextMenu from './ContextMenu';
import { useContextMenu } from '../hooks/useContextMenu';

export default function ChannelList({ onChannelSelect }) {
  const { currentServer, currentChannel } = useStore();
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

  if (!currentServer) {
    return (
      <div className="w-60 bg-tertiary p-4">
        <p className="text-secondary text-sm">No server selected</p>
      </div>
    );
  }

  const textChannels = currentServer.channels.filter(c => c.type === 'text');

  const handleChannelContextMenu = (e, channel) => {
    const items = [
      { label: 'Channel Settings', icon: '⚙️', action: () => console.log('Channel settings') },
      { label: 'Mute Channel', icon: '🔇', action: () => console.log('Mute channel') },
      { label: 'Copy Channel ID', icon: '📋', action: () => navigator.clipboard.writeText(channel.id) },
      { divider: true },
      { label: 'Create Invite', icon: '🔗', action: () => console.log('Create invite') },
    ];
    showContextMenu(e, items);
  };

  const handleServerContextMenu = (e) => {
    const items = [
      { label: 'Server Settings', icon: '⚙️', action: () => console.log('Server settings') },
      { label: 'Create Channel', icon: '#️⃣', action: () => console.log('Create channel') },
      { label: 'Invite People', icon: '👥', action: () => console.log('Invite people') },
      { label: 'Copy Server ID', icon: '📋', action: () => navigator.clipboard.writeText(currentServer.id) },
      { divider: true },
      { label: 'Leave Server', icon: '🚪', action: () => console.log('Leave server'), danger: true },
    ];
    showContextMenu(e, items);
  };

  return (
    <div className="w-60 bg-tertiary flex flex-col">
      {/* Server header */}
      <div
        className="h-12 px-4 flex items-center justify-between border-b border-light shadow-md interactive"
        onContextMenu={handleServerContextMenu}
      >
        <span className="font-bold text-primary truncate">{currentServer.name}</span>
        <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-xs font-bold text-secondary px-2 py-2">
          TEXT CHANNELS
        </div>

        {textChannels.map((channel) => (
          <div
            key={channel.id}
            onClick={() => onChannelSelect(channel)}
            onContextMenu={(e) => handleChannelContextMenu(e, channel)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer interactive ${
              currentChannel?.id === channel.id
                ? 'bg-hover text-primary'
                : 'text-secondary hover:bg-hover hover:text-primary'
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.88 21l.59-3h-3.5l.41-2h3.5l.78-4h-3.5l.41-2h3.5l.59-3h2l-.59 3h4l.59-3h2l-.59 3h3.5l-.41 2h-3.5l-.78 4h3.5l-.41 2h-3.5l-.59 3h-2l.59-3h-4l-.59 3h-2zm3.5-5h4l.78-4h-4l-.78 4z" />
            </svg>
            <span className="truncate">{channel.name}</span>
          </div>
        ))}
      </div>

      {/* User panel */}
      <div className="h-14 bg-secondary px-2 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold">
          {useStore.getState().user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-primary truncate">
            {useStore.getState().user?.username}
          </div>
          <div className="text-xs text-secondary">Online</div>
        </div>
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
