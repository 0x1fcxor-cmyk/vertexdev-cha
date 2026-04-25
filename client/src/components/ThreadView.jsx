import { useState } from 'react';
import { MessageSquare, ChevronRight, Send, MoreVertical } from 'lucide-react';

const ThreadView = ({ thread, onReply, onClose }) => {
  const [replyText, setReplyText] = useState('');

  const handleSendReply = () => {
    if (replyText.trim()) {
      onReply?.(thread.id, replyText);
      setReplyText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-green-500" />
          <div>
            <h3 className="font-bold text-white">Thread</h3>
            <p className="text-xs text-gray-400">{thread.messageCount} messages</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="p-4 bg-gray-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {thread.author?.username?.[0] || '?'}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-white">{thread.author?.username}</span>
                <span className="text-xs text-gray-400">{new Date(thread.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-gray-300">{thread.content}</p>
            </div>
          </div>
        </div>

        {thread.replies?.map((reply) => (
          <div key={reply.id} className="flex items-start gap-3 p-3 hover:bg-gray-800 rounded-lg transition-colors">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">
                {reply.author?.username?.[0] || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-white text-sm">{reply.author?.username}</span>
                <span className="text-xs text-gray-400">{new Date(reply.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-gray-300 text-sm">{reply.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
            placeholder="Reply to thread..."
            className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleSendReply}
            className="p-2 bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
          <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThreadView;
