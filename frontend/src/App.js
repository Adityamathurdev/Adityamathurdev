import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PassengerDashboard from './pages/PassengerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import BookRide from './pages/BookRide';
import RideTracking from './pages/RideTracking';
import ProfilePage from './pages/ProfilePage';
import RideHistory from './pages/RideHistory';
import DriverRegistration from './pages/DriverRegistration';
import NotFoundPage from './pages/NotFoundPage';

// Components
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';

// Styles
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="App min-h-screen bg-gray-50">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/login" 
          element={user ? <Navigate to={getDashboardPath(user)} replace /> : <LoginPage />} 
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to={getDashboardPath(user)} replace /> : <RegisterPage />} 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/passenger/*" 
          element={
            <ProtectedRoute requiredUserType="passenger">
              <Routes>
                <Route index element={<PassengerDashboard />} />
                <Route path="book-ride" element={<BookRide />} />
                <Route path="ride-tracking/:rideId" element={<RideTracking />} />
                <Route path="history" element={<RideHistory />} />
                <Route path="profile" element={<ProfilePage />} />
              </Routes>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/driver/*" 
          element={
            <ProtectedRoute requiredUserType="driver">
              <Routes>
                <Route index element={<DriverDashboard />} />
                <Route path="register" element={<DriverRegistration />} />
                <Route path="ride-tracking/:rideId" element={<RideTracking />} />
                <Route path="history" element={<RideHistory />} />
                <Route path="profile" element={<ProfilePage />} />
              </Routes>
            </ProtectedRoute>
          } 
        />
        
        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
    </div>
  );
}

function getDashboardPath(user) {
  return user.userType === 'driver' ? '/driver' : '/passenger';
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <SocketProvider>
            <AppContent />
          </SocketProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;