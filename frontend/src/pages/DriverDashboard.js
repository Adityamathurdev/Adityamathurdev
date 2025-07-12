import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FaCar, FaSignOutAlt } from 'react-icons/fa';

const DriverDashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FaCar className="text-2xl text-blue-600 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">RideShare Driver</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
              <button
                onClick={logout}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FaSignOutAlt className="mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Driver Dashboard</h2>
          <p className="text-gray-600 mb-6">
            Driver features coming soon...
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900">Go Online</h3>
              <p className="text-sm text-gray-600">Start accepting ride requests</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900">Earnings</h3>
              <p className="text-sm text-gray-600">View your daily earnings</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;