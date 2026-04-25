const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(userId && { 'X-User-Id': userId }),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const authAPI = {
  register: (data) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  login: (data) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  verify: () => apiRequest('/auth/verify')
};

export const channelsAPI = {
  getChannels: () => apiRequest('/channels'),
  
  getMessages: (channelId, limit = 50, offset = 0) => 
    apiRequest(`/channels/${channelId}/messages?limit=${limit}&offset=${offset}`),
  
  createChannel: (data) => apiRequest('/channels', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};

export const messagesAPI = {
  getOnlineUsers: () => apiRequest('/messages/users/online'),
  
  getChannelMembers: (channelId) => 
    apiRequest(`/messages/channels/${channelId}/members`)
};
