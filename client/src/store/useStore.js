import { create } from 'zustand';

export const useStore = create((set, get) => ({
  user: null,
  token: null,
  servers: [],
  currentServer: null,
  currentChannel: null,
  messages: [],
  onlineUsers: [],
  typingUsers: new Set(),
  
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  
  setServers: (servers) => set({ servers }),
  
  setCurrentServer: (server) => set({ currentServer: server }),
  
  setCurrentChannel: (channel) => set({ currentChannel: channel }),
  
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  
  addOnlineUser: (user) => set((state) => ({
    onlineUsers: [...state.onlineUsers, user]
  })),
  
  removeOnlineUser: (userId) => set((state) => ({
    onlineUsers: state.onlineUsers.filter(u => u.id !== userId)
  })),
  
  setTypingUser: (userId, isTyping) => set((state) => {
    const typingUsers = new Set(state.typingUsers);
    if (isTyping) {
      typingUsers.add(userId);
    } else {
      typingUsers.delete(userId);
    }
    return { typingUsers };
  }),
  
  clearTypingUsers: () => set({ typingUsers: new Set() }),
  
  logout: () => set({
    user: null,
    token: null,
    servers: [],
    currentServer: null,
    currentChannel: null,
    messages: [],
    onlineUsers: [],
    typingUsers: new Set()
  })
}));
