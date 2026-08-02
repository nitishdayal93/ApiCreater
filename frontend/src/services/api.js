const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getRefreshToken = () => localStorage.getItem('refreshToken');
export const setRefreshToken = (token) => {
  if (token) {
    localStorage.setItem('refreshToken', token);
  } else {
    localStorage.removeItem('refreshToken');
  }
};

export const clearAuthTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('authUser');
};

export const request = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthTokens();
    }
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
};

export const api = {
  // Auth
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getProfile: () => request('/auth/profile', { method: 'GET' }),

  // Projects & Generator
  getProjects: () => request('/generator/projects', { method: 'GET' }),
  getProjectDetails: (id) => request(`/generator/projects/${id}`, { method: 'GET' }),
  deleteProject: (id) => request(`/generator/projects/${id}`, { method: 'DELETE' }),
  generateDirect: (prompt, database) => request('/generator/generate', { method: 'POST', body: JSON.stringify({ prompt, database }) }),
  
  // Chats
  getChats: () => request('/generator/chats', { method: 'GET' }),
  getChatMessages: (chatId) => request(`/generator/chats/${chatId}/messages`, { method: 'GET' }),
  updateChat: (chatId, updates) => request(`/generator/chats/${chatId}`, { method: 'PUT', body: JSON.stringify(updates) }),
  deleteChat: (chatId) => request(`/generator/chats/${chatId}`, { method: 'DELETE' }),

  // Admin
  getDashboardStats: () => request('/admin/dashboard', { method: 'GET' }),
};

export default api;
