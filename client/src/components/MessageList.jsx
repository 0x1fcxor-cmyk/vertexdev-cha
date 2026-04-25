import { useStore } from '../store/useStore';
import EnhancedMessage from './EnhancedMessage';
import ContextMenu from './ContextMenu';
import { useContextMenu } from '../hooks/useContextMenu';

export default function MessageList({ messagesEndRef }) {
  const { messages, currentChannel, typingUsers, user } = useStore();
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

  const handleMessageEdit = (messageId, newContent) => {
    // Update message in store
    const { setMessages } = useStore.getState();
    setMessages(messages.map(m =>
      m.id === messageId
        ? { ...m, content: newContent, edited: true, edited_at: new Date().toISOString() }
        : m
    ));
  };

  const handleMessageDelete = (messageId) => {
    const { setMessages } = useStore.getState();
    setMessages(messages.filter(m => m.id !== messageId));
  };

  const handleMessageReply = (message) => {
    // Implement reply functionality
    console.log('Reply to:', message);
  };

  const handleMessageContextMenu = (e, message) => {
    const items = [
      { label: 'Reply', icon: '↩️', action: () => handleMessageReply(message) },
      { label: 'Edit', icon: '✏️', action: () => handleMessageEdit(message.id, message.content) },
      { label: 'Copy', icon: '📋', action: () => navigator.clipboard.writeText(message.content) },
      { divider: true },
      { label: 'Pin', icon: '📌', action: () => console.log('Pin message') },
      { label: 'Bookmark', icon: '🔖', action: () => console.log('Bookmark message') },
      { divider: true },
      { label: 'Delete', icon: '🗑️', action: () => handleMessageDelete(message.id), danger: true },
    ];

    if (message.user_id !== user?.id) {
      // Remove edit and delete for other users' messages
      items.splice(1, 1);
      items.pop();
    }

    showContextMenu(e, items);
  };

  const handleChannelContextMenu = (e) => {
    const items = [
      { label: 'Channel Settings', icon: '⚙️', action: () => console.log('Channel settings') },
      { label: 'Mute Channel', icon: '🔇', action: () => console.log('Mute channel') },
      { label: 'Copy Channel ID', icon: '📋', action: () => navigator.clipboard.writeText(currentChannel?.id) },
      { divider: true },
      { label: 'Create Invite', icon: '🔗', action: () => console.log('Create invite') },
    ];
    showContextMenu(e, items);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Channel header */}
      <div
        className="h-12 px-4 flex items-center border-b border-light shadow-sm interactive"
        onContextMenu={handleChannelContextMenu}
      >
        <svg className="w-6 h-6 text-secondary mr-2" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5.88 21l.59-3h-3.5l.41-2h3.5l.78-4h-3.5l.41-2h3.5l.59-3h2l-.59 3h4l.59-3h2l-.59 3h3.5l-.41 2h-3.5l-.78 4h3.5l-.41 2h-3.5l-.59 3h-2l.59-3h-4l-.59 3h-2zm3.5-5h4l.78-4h-4l-.78 4z" />
        </svg>
        <span className="font-bold text-primary">{currentChannel?.name}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-secondary">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const showHeader = index === 0 ||
              messages[index - 1].user_id !== message.user_id ||
              new Date(message.created_at) - new Date(messages[index - 1].created_at) > 300000;

            return (
              <EnhancedMessage
                key={message.id}
                message={message}
                currentUserId={user?.id}
                onEdit={handleMessageEdit}
                onDelete={handleMessageDelete}
                onReply={handleMessageReply}
                onContextMenu={handleMessageContextMenu}
              />
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="text-sm text-secondary italic px-2">
            Someone is typing...
          </div>
        )}

        <div ref={messagesEndRef} />
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
