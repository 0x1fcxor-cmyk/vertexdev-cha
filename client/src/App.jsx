import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { socketClient } from './lib/socket';
import { authAPI, channelsAPI, messagesAPI } from './lib/api';
import Login from './components/Login';
import MainLayout from './components/MainLayout';
import TitleBar from './components/TitleBar';
import WebSocketDebugPanel from './components/WebSocketDebugPanel';

function App() {
  const { user, token, setUser, setToken, setServers, setCurrentServer, setCurrentChannel, logout } = useStore();

  useEffect(() => {
    // Check for existing session
    const savedToken = localStorage.getItem('token');
    const savedUserId = localStorage.getItem('userId');

    if (savedToken && savedUserId) {
      verifyToken(savedToken, savedUserId);
    }
  }, []);

  useEffect(() => {
    if (user && token) {
      initializeSocket();
      loadUserData();
    }
  }, [user, token]);

  const verifyToken = async (token, userId) => {
    try {
      const data = await authAPI.verify();
      setUser(data.user);
      setToken(token);
      localStorage.setItem('token', token);
      localStorage.setItem('userId', data.user.id);
    } catch (error) {
      logout();
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
    }
  };

  const initializeSocket = () => {
    const socket = socketClient.connect();
    const userId = localStorage.getItem('userId');

    socketClient.authenticate(userId, token);

    // Listen for new messages
    socketClient.on('new_message', (message) => {
      const { addMessage, currentChannel } = useStore.getState();
      if (currentChannel && message.channelId === currentChannel.id) {
        addMessage(message);
      }
    });

    // Listen for user status updates
    socketClient.on('user_status_update', (data) => {
      const { addOnlineUser, removeOnlineUser } = useStore.getState();
      if (data.status === 'online') {
        addOnlineUser({ id: data.userId, status: 'online' });
      } else {
        removeOnlineUser(data.userId);
      }
    });

    // Listen for typing indicators
    socketClient.on('user_typing', (data) => {
      const { setTypingUser } = useStore.getState();
      setTypingUser(data.userId, true);
      
      // Clear typing after 3 seconds
      setTimeout(() => {
        setTypingUser(data.userId, false);
      }, 3000);
    });

    return () => {
      socketClient.off('new_message');
      socketClient.off('user_status_update');
      socketClient.off('user_typing');
    };
  };

  const loadUserData = async () => {
    try {
      // Load servers and channels
      const data = await channelsAPI.getChannels();
      setServers(data.servers);

      // Set first server and channel as current
      if (data.servers.length > 0) {
        const firstServer = data.servers[0];
        setCurrentServer(firstServer);
        
        if (firstServer.channels.length > 0) {
          setCurrentChannel(firstServer.channels[0]);
          socketClient.joinChannel(firstServer.channels[0].id);
        }
      }

      // Load online users
      const onlineData = await messagesAPI.getOnlineUsers();
      useStore.getState().setOnlineUsers(onlineData.users);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleLogin = async (credentials) => {
    try {
      const data = await authAPI.login(credentials);
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
    } catch (error) {
      throw error;
    }
  };

  const handleRegister = async (credentials) => {
    try {
      const data = await authAPI.register(credentials);
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = () => {
    socketClient.disconnect();
    logout();
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  };

  if (!user) {
    return (
      <>
        <TitleBar />
        <Login onLogin={handleLogin} onRegister={handleRegister} />
        <WebSocketDebugPanel />
      </>
    );
  }

  return (
    <>
      <TitleBar />
      <MainLayout onLogout={handleLogout} />
      <WebSocketDebugPanel />
    </>
  );
}

export default App;
