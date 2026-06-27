import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    console.log('API Request Interceptor - auth.currentUser:', user ? `Yes (${user.email})` : 'No (null/undefined)');
    if (user) {
      const token = await user.getIdToken(true); // true = force refresh
      console.log('API Request Interceptor - Token retrieved successfully. Length:', token ? token.length : 0);
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('API Request Interceptor - No active user found, Authorization header skipped.');
    }
  } catch (error) {
    console.error('Token error:', error);
  }
  return config;
});

export const analyzeMedia = async (mediaBase64, mediaType = 'image') => {
  const response = await api.post('/api/issues/analyze', { mediaBase64, mediaType });
  return response.data;
};

export const analyzeVoice = async (audioBase64) => {
  const response = await api.post('/api/issues/analyze-voice', { audioBase64 });
  return response.data;
};

export const submitIssue = async (issueData) => {
  const response = await api.post('/api/issues/submit', issueData);
  return response.data;
};

export const getIssues = async (params = {}) => {
  const response = await api.get('/api/issues', { params });
  return response.data;
};

export const getIssue = async (id) => {
  const response = await api.get(`/api/issues/${id}`);
  return response.data;
};

export const updateIssue = async (id, updateData) => {
  const response = await api.patch(`/api/issues/${id}`, updateData);
  return response.data;
};

export const resolveIssue = async (id, mediaBase64, mediaType = 'image') => {
  const response = await api.post(`/api/issues/${id}/resolve`, { mediaBase64, mediaType });
  return response.data;
};

export const upvoteIssue = async (id) => {
  const response = await api.post(`/api/issues/${id}/upvote`);
  return response.data;
};

export const verifyIssue = async (id, mediaBase64, mediaType = 'image') => {
  const response = await api.post(`/api/issues/${id}/verify`, { mediaBase64, mediaType });
  return response.data;
};

export const getDashboardStats = async () => {
  const response = await api.get('/api/dashboard/stats');
  return response.data;
};

export const getUserDashboard = async (userId) => {
  const response = await api.get(`/api/dashboard/user/${userId}`);
  return response.data;
};

export const runEscalator = async () => {
  const response = await api.post('/api/escalator/run');
  return response.data;
};

export const getActionQueue = async () => {
  const response = await api.post('/api/dashboard/action-queue');
  return response.data;
};

export const askIssueAI = async (id, question, history = []) => {
  const response = await api.post(`/api/issues/${id}/ask`, { question, history });
  return response.data;
};

export const getCityBulletin = async (forceRefresh = false) => {
  const response = await api.get(`/api/dashboard/city-bulletin${forceRefresh ? '?refresh=true' : ''}`);
  return response.data;
};

export const getOracleInsights = async () => {
  const response = await api.get('/api/dashboard/oracle-insights');
  return response.data;
};

export const getDepartmentScorecard = async () => {
  const response = await api.get('/api/dashboard/scorecard');
  return response.data;
};

export default api;

