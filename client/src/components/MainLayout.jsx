import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { socketClient } from '../lib/socket';
import { channelsAPI } from '../lib/api';
import Sidebar from './Sidebar';
import ChannelList from './ChannelList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';

export default function MainLayout({ onLogout }) {
  const { currentServer, currentChannel, setMessages, setCurrentChannel } = useStore();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (currentChannel) {
      loadMessages(currentChannel.id);
      socketClient.joinChannel(currentChannel.id);
    }

    return () => {
      if (currentChannel) {
        socketClient.leaveChannel(currentChannel.id);
      }
    };
  }, [currentChannel?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [useStore.getState().messages]);

  const loadMessages = async (channelId) => {
    try {
      const data = await channelsAPI.getMessages(channelId);
      setMessages(data.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleChannelSelect = (channel) => {
    if (currentChannel) {
      socketClient.leaveChannel(currentChannel.id);
    }
    setCurrentChannel(channel);
  };

  return (
    <div className="flex h-screen bg-primary">
      <Sidebar onLogout={onLogout} />
      <ChannelList onChannelSelect={handleChannelSelect} />
      <div className="flex-1 flex flex-col bg-tertiary">
        {currentChannel ? (
          <>
            <MessageList messagesEndRef={messagesEndRef} />
            <MessageInput />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-secondary">
            Select a channel to start chatting
          </div>
        )}
      </div>
      <UserList />
    </div>
  );
}
