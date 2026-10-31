import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { emitGlobalToast } from '../context/ToastContext.js';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('brightloop_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global Error Toast & Auth Guard
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    const responseData = error.response?.data;
    const status = error.response?.status;

    let errorMessage = 'An unexpected network error occurred. Please try again.';

    if (responseData?.message) {
      errorMessage = responseData.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Append validation details if present
    if (responseData?.errors && typeof responseData.errors === 'object') {
      const fieldErrors = Object.entries(responseData.errors)
        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
        .join('; ');
      if (fieldErrors) {
        errorMessage = `${errorMessage} (${fieldErrors})`;
      }
    }

    // Trigger Toast Notification
    emitGlobalToast(errorMessage, 'error');

    // Handle Session Expiry (401)
    if (status === 401) {
      localStorage.removeItem('brightloop_token');
      localStorage.removeItem('brightloop_user');
      // Redirect to login if not already on an auth page
      if (
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register') &&
        !window.location.pathname.startsWith('/forgot-password') &&
        !window.location.pathname.startsWith('/reset-password')
      ) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;

