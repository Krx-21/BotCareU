import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data.data.tokens;
          localStorage.setItem('accessToken', accessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API response type
interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.post<ApiResponse<{ user: any; tokens: any }>>('/auth/login', credentials),

  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    gender?: string;
  }) => apiClient.post<ApiResponse<{ user: any; tokens: any }>>('/auth/register', userData),

  logout: () => apiClient.delete<ApiResponse>('/auth/logout'),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<{ tokens: any }>>('/auth/refresh', { refreshToken }),

  me: () => apiClient.get<ApiResponse<{ user: any }>>('/auth/me'),

  updateProfile: (userData: any) =>
    apiClient.put<ApiResponse<{ user: any }>>('/users/profile', userData),

  changePassword: (passwordData: {
    currentPassword: string;
    newPassword: string;
  }) => apiClient.post<ApiResponse>('/auth/change-password', passwordData),
};

// Device API
export const deviceAPI = {
  getDevices: () => apiClient.get<ApiResponse<any[]>>('/devices'),

  getDevice: (deviceId: string) =>
    apiClient.get<ApiResponse<any>>(`/devices/${deviceId}`),

  pairDevice: (deviceData: {
    deviceId: string;
    pairingCode: string;
    name: string;
  }) => apiClient.post<ApiResponse<any>>('/devices/pair', deviceData),

  updateDevice: (deviceId: string, updateData: any) =>
    apiClient.put<ApiResponse<any>>(`/devices/${deviceId}`, updateData),

  removeDevice: (deviceId: string) =>
    apiClient.delete<ApiResponse>(`/devices/${deviceId}`),

  updateDeviceStatus: (deviceId: string, statusData: any) =>
    apiClient.put<ApiResponse>(`/devices/${deviceId}/status`, statusData),
};

// Temperature API
export const temperatureAPI = {
  getReadings: (params?: {
    deviceId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return apiClient.get<ApiResponse<{ readings: any[]; pagination: any }>>(
      `/temperature/readings?${queryParams}`
    );
  },

  createReading: (readingData: {
    deviceId: string;
    infraredTemp?: number;
    contactTemp?: number;
    ambientTemp?: number;
    measurementType: string;
    timestamp?: string;
  }) => apiClient.post<ApiResponse<any>>('/temperature/readings', readingData),

  getAnalytics: (params?: {
    deviceId?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return apiClient.get<ApiResponse<any>>(`/temperature/analytics?${queryParams}`);
  },
};

// Notification API
export const notificationAPI = {
  getNotifications: (params?: {
    unreadOnly?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return apiClient.get<ApiResponse<{ notifications: any[]; unreadCount: number }>>(
      `/notifications?${queryParams}`
    );
  },

  markAsRead: (notificationId: string) =>
    apiClient.put<ApiResponse>(`/notifications/${notificationId}/read`),

  markAllAsRead: () => apiClient.put<ApiResponse>('/notifications/read-all'),

  deleteNotification: (notificationId: string) =>
    apiClient.delete<ApiResponse>(`/notifications/${notificationId}`),
};

// Health API
export const healthAPI = {
  getStatus: () => apiClient.get<ApiResponse<any>>('/health'),
};

// Export the configured axios instance for custom requests
export default apiClient;
