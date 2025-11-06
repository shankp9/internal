import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// Users API
export const usersAPI = {
  getAll: (params?: any) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Clients API
export const clientsAPI = {
  getAll: () => api.get('/clients'),
  getById: (id: string) => api.get(`/clients/${id}`),
  create: (data: any) => api.post('/clients', data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

// Projects API
export const projectsAPI = {
  getAll: (params?: any) => api.get('/projects', { params }),
  getById: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

// Assignments API
export const assignmentsAPI = {
  getAll: (params?: any) => api.get('/assignments', { params }),
  getById: (id: string) => api.get(`/assignments/${id}`),
  create: (data: any) => api.post('/assignments', data),
  update: (id: string, data: any) => api.put(`/assignments/${id}`, data),
  approve: (id: string) => api.post(`/assignments/${id}/approve`),
  reject: (id: string, reason?: string) =>
    api.post(`/assignments/${id}/reject`, { rejectionReason: reason }),
  delete: (id: string) => api.delete(`/assignments/${id}`),
};

// Developers API
export const developersAPI = {
  getAll: (params?: any) => api.get('/developers', { params }),
  getById: (id: string, params?: any) => api.get(`/developers/${id}`, { params }),
  getCapacity: (id: string, startDate: string, endDate: string) =>
    api.get(`/developers/${id}/capacity`, {
      params: { startDate, endDate },
    }),
};

// Dashboard API
export const dashboardAPI = {
  manager: (params?: any) => api.get('/dashboard/manager', { params }),
  client: (clientId: string) => api.get('/dashboard/client', { params: { clientId } }),
  project: (projectId: string) => api.get('/dashboard/project', { params: { projectId } }),
  admin: () => api.get('/dashboard/admin'),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
};

// Search API
export const searchAPI = {
  search: (query: string) => api.get('/search', { params: { q: query } }),
};

// Profile API
export const profileAPI = {
  update: (data: { name?: string; password?: string; skills?: string[] }) =>
    api.put('/auth/profile', data),
};

// Meetings API
export const meetingsAPI = {
  create: (projectId: string, data: any) => {
    // If data is FormData, use appropriate headers
    if (data instanceof FormData) {
      return api.post(`/meetings/${projectId}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post(`/meetings/${projectId}`, data);
  },
  uploadTranscript: (meetingId: string, file: File) => {
    const formData = new FormData();
    formData.append('transcript', file);
    return api.post(`/meetings/${meetingId}/transcript`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getById: (meetingId: string) => api.get(`/meetings/${meetingId}`),
  getByProject: (projectId: string) => api.get(`/meetings/project/${projectId}`),
  generatePRD: (meetingId: string) => api.post(`/meetings/${meetingId}/generate-prd`),
  generateAssignments: (meetingId: string) => api.post(`/meetings/${meetingId}/generate-assignments`),
};

// PRD API
export const prdAPI = {
  getByProject: (projectId: string) => api.get(`/projects/${projectId}/prd`),
  getVersions: (projectId: string) => api.get(`/projects/${projectId}/prd/versions`),
  getVersion: (projectId: string, versionId: string) => api.get(`/projects/${projectId}/prd/versions/${versionId}`),
  getDiff: (projectId: string, versionId: string) => api.get(`/projects/${projectId}/prd/diff/${versionId}`),
  merge: (projectId: string, data: any) => api.post(`/projects/${projectId}/prd/merge`, data),
};

// Assignment Suggestions API
export const assignmentSuggestionsAPI = {
  getByProject: (projectId: string, params?: any) => api.get(`/projects/${projectId}/assignment-suggestions`, { params }),
  getTasks: (suggestionId: string) => api.get(`/assignment-suggestions/${suggestionId}/tasks`),
  approve: (suggestionId: string) => api.post(`/assignment-suggestions/${suggestionId}/approve`),
  reject: (suggestionId: string, reason?: string) => api.post(`/assignment-suggestions/${suggestionId}/reject`, { rejectionReason: reason }),
  getHistory: (projectId: string) => api.get(`/projects/${projectId}/assignment-suggestions/history`),
};

// Developer Tasks API
export const developerTasksAPI = {
  getByAssignment: (assignmentId: string) => api.get(`/assignments/${assignmentId}/tasks`),
  getByDeveloper: (developerId: string, params?: any) => api.get(`/developers/${developerId}/tasks`, { params }),
  update: (taskId: string, data: any) => api.put(`/developer-tasks/${taskId}`, data),
};
