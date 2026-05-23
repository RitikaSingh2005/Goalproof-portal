import axios from 'axios';

const API_URL = 'https://goalproof-backend.onrender.com/api';

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
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getGoals = () => api.get('/goals');
export const createGoal = (data) => api.post('/goals', data);
export const updateGoal = (id, data) => api.put(`/goals/${id}`, data);
export const deleteGoal = (id) => api.delete(`/goals/${id}`);
export const submitAllGoals = () => api.post('/goals/submit-all');

export const getSmartScore = (title) => api.post('/ai/smart-score', { title });
export const verifyAchievement = (data) => api.post('/ai/verify-achievement', data);

// Check-in APIs
export const getActiveWindow = () => api.get('/checkin/active');
export const submitCheckin = (data) => api.post('/checkin', data);
export const getCheckinHistory = () => api.get('/checkin/history');

// Manager APIs
export const editGoal = (id, data) => api.put(`/manager/goal/${id}`, data);
export const getTeamAnalytics = () => api.get('/manager/analytics');
export const getAttentionScore = () => api.get('/manager/attention');
export const getPendingGoals = () => api.get('/manager/pending');
export const approveGoal = (id) => api.put(`/manager/goals/${id}/approve`);
export const rejectGoal = (id) => api.put(`/manager/goals/${id}/reject`);
export const editGoalByManager = (id, data) => api.put(`/manager/goals/${id}/edit`, data);
export const addManagerComment = (employeeId, data) => api.post(`/manager/checkin/${employeeId}`, data);

// Admin APIs
export const createCycle = (data) => api.post('/admin/cycles', data);
export const getCycles = () => api.get('/admin/cycles');
export const getAdminInsights = () => api.get('/admin/insights');
export const getAuditLogs = () => api.get('/admin/audit-log');
export const updateCycle = (id, data) => api.put(`/admin/cycles/${id}`, data);
export const unlockGoal = (id, justification) => api.put(`/admin/goals/${id}/unlock`, { justification });
export const getEmployees = () => api.get('/admin/employees');
export const createSharedGoal = (data) => api.post('/admin/shared-goal', data);
export const getSharedAnalytics = () => api.get('/admin/shared-analytics');
export const getSharedGoals = () => api.get('/goals/shared');
export const downloadAdminReport = () => api.get('/admin/report', { responseType: 'blob' });

export default api;
