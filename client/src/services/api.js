import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (username, email, password) =>
    api.post('/auth/register', { username, email, password }),

  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  getCurrentUser: () =>
    api.get('/auth/me'),
};

// Keys API
export const keysAPI = {
  uploadPublicKey: (publicKey) =>
    api.post('/keys/upload', { publicKey }),

  getPublicKey: (userId) =>
    api.get(`/keys/${userId}`),

  getAllUsers: () =>
    api.get('/keys'),
};

// Chat API
export const chatAPI = {
  getMessageHistory: (otherUserId, limit = 50, before = null) => {
    const params = { limit };
    if (before) params.before = before;
    return api.get(`/chat/history/${otherUserId}`, { params });
  },

  markAsRead: (otherUserId) =>
    api.put(`/chat/read/${otherUserId}`),
};

export default api;

