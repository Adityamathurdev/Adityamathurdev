import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));

  // Set up axios interceptors
  useEffect(() => {
    // Request interceptor to add token to headers
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const response = await axios.post('/api/auth/refresh-token', {
              refreshToken: refreshToken
            });

            const { token: newToken, refreshToken: newRefreshToken } = response.data;
            
            setToken(newToken);
            setRefreshToken(newRefreshToken);
            localStorage.setItem('token', newToken);
            localStorage.setItem('refreshToken', newRefreshToken);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    // Cleanup interceptors on unmount
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token, refreshToken]);

  // Load user profile on mount
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await axios.get('/api/auth/profile');
          setUser(response.data.user);
        } catch (error) {
          console.error('Failed to load user profile:', error);
          // Clear invalid token
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setToken(null);
          setRefreshToken(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { user, token: newToken, refreshToken: newRefreshToken } = response.data;

      setUser(user);
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      toast.success('Login successful!');
      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);
      const { user, token: newToken, refreshToken: newRefreshToken } = response.data;

      setUser(user);
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      toast.success('Registration successful!');
      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    toast.success('Logged out successfully');
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/auth/profile', profileData);
      setUser(response.data.user);
      toast.success('Profile updated successfully!');
      return { success: true, user: response.data.user };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to update profile';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.put('/api/auth/change-password', {
        currentPassword,
        newPassword
      });
      toast.success('Password changed successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to change password';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const forgotPassword = async (email) => {
    try {
      await axios.post('/api/auth/forgot-password', { email });
      toast.success('Password reset email sent!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to send reset email';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      await axios.post('/api/auth/reset-password', {
        token,
        newPassword
      });
      toast.success('Password reset successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to reset password';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const verifyEmail = async (token) => {
    try {
      await axios.post('/api/auth/verify-email', { token });
      toast.success('Email verified successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to verify email';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    token,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    isAuthenticated: !!user,
    isDriver: user?.userType === 'driver',
    isPassenger: user?.userType === 'passenger'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};