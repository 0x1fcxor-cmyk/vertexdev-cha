import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { socketClient } from '../lib/socket';

export default function MessageInput() {
  const [message, setMessage] = useState('');
  const { currentChannel, user, addMessage } = useStore();
  const [isTyping, setIsTyping] = useState(false);
  let typingTimeout;

  const handleSend = () => {
    if (!message.trim() || !currentChannel) return;

    socketClient.sendMessage(currentChannel.id, message);
    setMessage('');
    socketClient.stopTyping(currentChannel.id);
  };

  const handleChange = (e) => {
    setMessage(e.target.value);

    if (!isTyping && currentChannel) {
      setIsTyping(true);
      socketClient.startTyping(currentChannel.id);
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      if (isTyping && currentChannel) {
        setIsTyping(false);
        socketClient.stopTyping(currentChannel.id);
      }
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    return () => clearTimeout(typingTimeout);
  }, []);

  return (
    <div className="px-4 pb-6">
      <div className="bg-floating rounded-lg flex items-center px-4 border border-light">
        <button className="text-secondary hover:text-primary p-2 interactive">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <input
          type="text"
          value={message}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={`Message #${currentChannel?.name || '...'}`}
          className="flex-1 bg-transparent py-3 px-2 text-primary placeholder-secondary focus:outline-none"
          disabled={!currentChannel}
        />

        <div className="flex items-center gap-2">
          <button className="text-secondary hover:text-primary p-2 interactive">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button
            onClick={handleSend}
            disabled={!message.trim() || !currentChannel}
            className="text-secondary hover:text-accent p-2 disabled:opacity-50 interactive"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
