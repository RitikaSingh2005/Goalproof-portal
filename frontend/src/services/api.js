import axios from 'axios';
import toast from 'react-hot-toast';

const getDefaultApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://goalproof-portal.onrender.com/api';
  }
  return 'http://localhost:5000/api';
};

const API_URL = getDefaultApiUrl();

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const message = data?.message || data?.error;

    if (status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    } else if (status === 403) {
      toast.error(message || 'Access denied: insufficient permissions');
    } else if (status === 404) {
      toast.error(message || 'Resource not found');
    } else if (status === 429) {
      toast.error('Too many requests. Please slow down and try again shortly.');
    } else if (status >= 500) {
      toast.error(message || 'Internal server error. Please try again later.');
    }

    return Promise.reject(error);
  }
);

// Auth APIs
export const loginUser = (credentials) => api.post('/auth/login', credentials);
export const registerUser = (userData) => api.post('/auth/register', userData);
export const getCurrentUser = () => api.get('/auth/me');

// Goal APIs
export const getGoals = () => api.get('/goals');
export const createGoal = (data) => api.post('/goals', data);
export const updateGoal = (id, data) => api.put(`/goals/${id}`, data);
export const editGoal = (id, data) => api.put(`/goals/${id}`, data); // Alias for updateGoal
export const deleteGoal = (id) => api.delete(`/goals/${id}`);
export const submitAllGoals = () => api.post('/goals/submit-all');
export const getSharedGoals = () => api.get('/goals/shared');

// AI APIs
export const getSmartScore = (title) => api.post('/ai/smart-score', { title });
export const verifyAchievement = (data) => api.post('/ai/verify-achievement', data);

// Check-in APIs
export const getActiveWindow = () => api.get('/checkin/active');
export const submitCheckin = (data) => api.post('/checkin', data);
export const getCheckinHistory = () => api.get('/checkin/history');

// Manager APIs
export const getPendingGoals = () => api.get('/manager/pending');
export const getTeamAnalytics = () => api.get('/manager/team');
export const getAttentionScore = () => api.get('/manager/attention-score');
export const approveGoal = (id) => api.put(`/manager/goals/${id}/approve`);
export const rejectGoal = (id) => api.put(`/manager/goals/${id}/reject`);
export const editGoalByManager = (id, data) => api.put(`/manager/goals/${id}/edit`, data);
export const addManagerComment = (employeeId, data) => api.post(`/manager/checkin/${employeeId}`, data);

// Admin APIs
export const createCycle = (data) => api.post('/admin/cycles', data);
export const getCycles = () => api.get('/admin/cycles');
export const updateCycle = (id, data) => api.put(`/admin/cycles/${id}`, data);
export const getAdminInsights = () => api.get('/admin/insights');
export const getSharedAnalytics = () => api.get('/admin/shared-analytics');
export const getAuditLogs = () => api.get('/admin/audit-log');
export const downloadAdminReport = () => api.get('/admin/report', { responseType: 'blob' });
export const unlockGoal = (id, justification) => api.put(`/admin/goals/${id}/unlock`, { justification });
export const getEmployees = () => api.get('/admin/employees');
export const createSharedGoal = (data) => api.post('/admin/shared-goal', data);

export default api;
