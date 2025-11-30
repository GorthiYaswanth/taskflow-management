import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('API Request - Token status:', token ? 'exists' : 'missing', 'URL:', config.url);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('API Request - Authorization header added');
    } else {
      console.log('API Request - No token found, request will be unauthenticated');
    }
    console.log('API Request:', config.method?.toUpperCase(), config.url, config.data);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url, response.data);
    return response;
  },
  async (error) => {
    console.log('API Error:', error.response?.status, error.config?.url, error.response?.data);
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('token', access);
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login/', { email, password }),
  register: (userData) => api.post('/auth/register/', userData),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (userData) => api.put('/auth/profile/update/', userData),
  changePassword: (passwordData) => api.post('/auth/change-password/', passwordData),
  getUsers: () => api.get('/auth/users/'),
  getEmployees: () => api.get('/auth/employees/'),
  getUser: (id) => api.get(`/auth/users/${id}/`),
  updateUser: (id, userData) => api.put(`/auth/users/${id}/`, userData),
  deleteUser: (id) => api.delete(`/auth/users/${id}/`),
  createUser: (userData) => api.post('/auth/users/', userData),
};

// Helper to remove empty/undefined query params
const cleanParams = (params = {}) => {
  const cleaned = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string' && value.trim() === '') return;
    cleaned[key] = value;
  });
  return cleaned;
};

// Tasks API
export const tasksAPI = {
  getTasks: (params) => api.get('/tasks/', { params: cleanParams(params) }),
  getTask: (id) => api.get(`/tasks/${id}/`),
  createTask: (taskData) => api.post('/tasks/', taskData),
  updateTask: (id, taskData) => api.patch(`/tasks/${id}/`, taskData),
  deleteTask: (id) => api.delete(`/tasks/${id}/`),
  getTaskComments: (taskId) => api.get(`/tasks/${taskId}/comments/`),
  createTaskComment: (taskId, commentData) => api.post(`/tasks/${taskId}/comments/`, commentData),
  getTaskAnalytics: () => api.get('/tasks/analytics/'),
  getNotifications: () => api.get('/tasks/notifications/'),
  getKanbanTasks: (projectId) => api.get('/tasks/kanban/', { params: cleanParams({ project: projectId }) }),
  updateTaskStatus: (taskId, status) => api.patch(`/tasks/${taskId}/status/`, { status }),
};

// Projects API
export const projectsAPI = {
  getProjects: () => api.get('/projects/'),
  getMyProjects: () => api.get('/projects/my/'),
  getAssignedProjects: () => api.get('/projects/assigned/'),
  getProject: (id) => api.get(`/projects/${id}/`),
  createProject: (projectData) => api.post('/projects/', projectData),
  updateProject: (id, projectData) => api.put(`/projects/${id}/`, projectData),
  deleteProject: (id) => api.delete(`/projects/${id}/`),
  getProjectAnalytics: (projectId) => api.get(`/projects/${projectId}/analytics/`),
  getProjectMemberPerformance: (projectId) => api.get(`/projects/${projectId}/member-performance/`),
  getProjectMembers: (projectId) => api.get(`/projects/${projectId}/members/`),
  addProjectMember: (projectId, memberData) => api.post(`/projects/${projectId}/members/`, memberData),
  removeProjectMember: (projectId, memberId) => api.delete(`/projects/${projectId}/members/${memberId}/`),
  getProjectMessages: (projectId) => api.get(`/projects/${projectId}/messages/`),
  createProjectMessage: (projectId, messageData) => {
    console.log('API: Creating project message', { projectId, messageData });
    return api.post(`/projects/${projectId}/messages/`, messageData);
  },
};

// Time Tracking API
export const timeTrackingAPI = {
  getTimeSessions: (params) => api.get('/time-tracking/sessions/', { params: cleanParams(params) }),
  createTimeSession: (sessionData) => api.post('/time-tracking/sessions/', sessionData),
  updateTimeSession: (id, sessionData) => api.patch(`/time-tracking/sessions/${id}/`, sessionData),
  deleteTimeSession: (id) => api.delete(`/time-tracking/sessions/${id}/`),
  getTimeAnalytics: (params) => api.get('/time-tracking/analytics/', { params: cleanParams(params) }),
  getActiveSession: () => api.get('/time-tracking/active-session/'),
  startSession: (taskId) => api.post('/time-tracking/start/', { task_id: taskId }),
  stopSession: (sessionId) => api.post(`/time-tracking/stop/${sessionId}/`),
};

export default api;
