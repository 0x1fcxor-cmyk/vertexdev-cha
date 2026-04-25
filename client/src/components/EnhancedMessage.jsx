import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { emojify } from 'react-emoji';
import { format } from 'date-fns';
import { apiRequest } from '../lib/api';

export default function EnhancedMessage({ message, currentUserId, onReply, onEdit, onDelete, onContextMenu }) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👎'];
  const userReaction = message.reactions?.find(r => r.user_id === currentUserId);
  const reactionCounts = {};
  
  message.reactions?.forEach(r => {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
  });

  const getInitials = (username) => {
    return username?.substring(0, 2).toUpperCase() || '??';
  };

  const getAvatarColor = (userId) => {
    const colors = ['#5865f2', '#3ba55c', '#faa61a', '#ed4245', '#9b59b6', '#1abc9c'];
    const index = userId?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index] || colors[0];
  };

  const handleReaction = async (emoji) => {
    try {
      await apiRequest(`/api/messages/${message.id}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji })
      });
      setShowReactions(false);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleEdit = async () => {
    try {
      await apiRequest(`/api/messages/${message.id}`, {
        method: 'PUT',
        body: JSON.stringify({ content: editContent })
      });
      setIsEditing(false);
      onEdit?.(message.id, editContent);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await apiRequest(`/api/messages/${message.id}`, {
          method: 'DELETE'
        });
        onDelete?.(message.id);
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    }
  };

  const handlePin = async () => {
    try {
      await apiRequest(`/api/messages/${message.id}/pin`, {
        method: 'PUT',
        body: JSON.stringify({ pinned: !message.pinned })
      });
    } catch (error) {
      console.error('Failed to pin message:', error);
    }
  };

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👀'];

  const reactionCount = message.reactions ? Object.keys(message.reactions).length : 0;

  return (
    <div
      className="group hover:bg-hover rounded px-2 py-1 -mx-2 relative interactive"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onContextMenu={(e) => onContextMenu?.(e, message)}
    >
      {message.pinned && (
        <div className="absolute -top-3 left-8 text-xs text-green">
          📌 Pinned
        </div>
      )}

      <div className="flex gap-4 mt-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
          style={{ backgroundColor: getAvatarColor(message.user_id) }}
        >
          {getInitials(message.user?.username)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-primary hover:underline cursor-pointer">
              {message.user?.username || 'Unknown'}
            </span>
            <span className="text-xs text-secondary">
              {format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}
            </span>
            {message.edited && (
              <span className="text-xs text-secondary italic">(edited)</span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-secondary border border-light rounded p-2 text-primary resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleEdit}
                  className="px-3 py-1 bg-accent text-white rounded text-sm hover:bg-accent-hover"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 bg-floating text-primary rounded text-sm hover:bg-hover"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-primary break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code: ({ node, inline, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="bg-secondary px-1 rounded text-sm" {...props}>
                        {children}
                      </code>
                    );
                  },
                  a: ({ node, ...props }) => (
                    <a className="text-accent hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-accent pl-4 italic bg-secondary/50 py-2" {...props} />
                  ),
                  spoiler: ({ node, children, ...props }) => (
                    <span
                      className="spoiler bg-accent/20 cursor-pointer transition-all"
                      onClick={(e) => {
                        e.currentTarget.classList.toggle('revealed');
                      }}
                      {...props}
                    >
                      {children}
                    </span>
                  )
                }}
              >
                {emojify(message.content)}
              </ReactMarkdown>
            </div>
          )}

          {message.embeds && message.embeds.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.embeds.map((embed, idx) => (
                <div key={idx} className="bg-secondary rounded-lg p-3 border border-light">
                  {embed.siteName && (
                    <div className="text-xs text-secondary mb-1">{embed.siteName}</div>
                  )}
                  {embed.title && (
                    <a href={embed.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium block mb-1">
                      {embed.title}
                    </a>
                  )}
                  {embed.description && (
                    <div className="text-sm text-primary mb-2">{embed.description}</div>
                  )}
                  {embed.image && (
                    <img src={embed.image} alt="" className="rounded max-w-full" loading="lazy" />
                  )}
                  {embed.type === 'youtube' && embed.videoId && (
                    <div className="mt-2">
                      <iframe
                        width="400"
                        height="225"
                        src={`https://www.youtube.com/embed/${embed.videoId}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="rounded"
                      />
                    </div>
                  )}
                  {embed.type === 'spotify' && (
                    <div className="mt-2">
                      <iframe
                        src={`https://open.spotify.com/embed/${embed.itemType}/${embed.id}`}
                        width="400"
                        height="80"
                        frameBorder="0"
                        allow="encrypted-media"
                        className="rounded"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {message.attachments.map((attachment, index) => (
                <div key={index} className="relative">
                  {attachment.type?.startsWith('image') ? (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="rounded-lg max-h-64 w-full object-cover"
                    />
                  ) : (
                    <div className="bg-secondary rounded-lg p-4 flex items-center gap-3">
                      <span className="text-2xl">📎</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{attachment.name}</div>
                        <div className="text-xs text-secondary">
                          {attachment.size ? formatFileSize(attachment.size) : ''}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {reactionCount > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {Object.entries(message.reactions || {}).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={`px-2 py-1 rounded-full text-sm border ${
                    users.includes(currentUserId)
                      ? 'bg-accent border-accent text-white'
                      : 'bg-secondary border-light text-primary hover:border-accent'
                  }`}
                >
                  {emoji} {users.length}
                </button>
              ))}
            </div>
          )}
        </div>

        {showActions && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-2 text-secondary hover:text-primary hover:bg-hover rounded"
              title="Add reaction"
            >
              😊
            </button>
            <button
              onClick={() => onReply?.(message)}
              className="p-2 text-secondary hover:text-primary hover:bg-hover rounded"
              title="Reply"
            >
              ↩️
            </button>
            {message.user_id === currentUserId && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-secondary hover:text-primary hover:bg-hover rounded"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-secondary hover:text-red-400 hover:bg-hover rounded"
                  title="Delete"
                >
                  🗑️
                </button>
              </>
            )}
            <button
              onClick={handlePin}
              className={`p-2 ${message.pinned ? 'text-accent' : 'text-secondary'} hover:text-primary hover:bg-hover rounded`}
              title={message.pinned ? 'Unpin' : 'Pin'}
            >
              📌
            </button>
          </div>
        )}
      </div>

      {showReactions && (
        <div className="absolute left-14 top-0 bg-floating rounded-lg shadow-xl p-2 flex gap-2 z-10">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="text-2xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
