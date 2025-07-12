import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requiredUserType = null }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredUserType && user?.userType !== requiredUserType) {
    // Redirect to appropriate dashboard based on user type
    const redirectPath = user?.userType === 'driver' ? '/driver' : '/passenger';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;