import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaCar, FaHistory, FaUser, FaSignOutAlt, FaMapMarkerAlt, FaClock, FaStar } from 'react-icons/fa';

const PassengerDashboard = () => {
  const { user, logout } = useAuth();

  const quickActions = [
    {
      title: 'Book a Ride',
      description: 'Find a ride to your destination',
      icon: <FaCar className="text-3xl" />,
      link: '/passenger/book-ride',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Ride History',
      description: 'View your past rides',
      icon: <FaHistory className="text-3xl" />,
      link: '/passenger/history',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Profile',
      description: 'Manage your account',
      icon: <FaUser className="text-3xl" />,
      link: '/passenger/profile',
      color: 'bg-purple-500 hover:bg-purple-600'
    }
  ];

  const recentRides = [
    {
      id: 1,
      from: 'Home',
      to: 'Office',
      date: '2024-01-15',
      fare: '₹120',
      status: 'completed'
    },
    {
      id: 2,
      from: 'Mall',
      to: 'Airport',
      date: '2024-01-14',
      fare: '₹450',
      status: 'completed'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FaCar className="text-2xl text-blue-600 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">RideShare</h1>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.name}!
          </h2>
          <p className="text-gray-600">Where would you like to go today?</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className={`${action.color} text-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105`}
            >
              <div className="flex items-center mb-4">
                {action.icon}
                <h3 className="text-lg font-semibold ml-3">{action.title}</h3>
              </div>
              <p className="text-sm opacity-90">{action.description}</p>
            </Link>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Rides</p>
                <p className="text-2xl font-bold text-gray-900">{user?.totalRides || 0}</p>
              </div>
              <FaCar className="text-blue-500 text-2xl" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rating</p>
                <p className="text-2xl font-bold text-gray-900">{user?.rating?.toFixed(1) || 'N/A'}</p>
              </div>
              <FaStar className="text-yellow-500 text-2xl" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Saved Places</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
              <FaMapMarkerAlt className="text-green-500 text-2xl" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Member Since</p>
                <p className="text-sm font-bold text-gray-900">
                  {new Date(user?.createdAt).toLocaleDateString()}
                </p>
              </div>
              <FaClock className="text-purple-500 text-2xl" />
            </div>
          </div>
        </div>

        {/* Recent Rides */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Rides</h3>
            <Link to="/passenger/history" className="text-blue-600 hover:text-blue-800 font-medium">
              View All
            </Link>
          </div>
          
          {recentRides.length > 0 ? (
            <div className="space-y-4">
              {recentRides.map((ride) => (
                <div key={ride.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FaMapMarkerAlt className="text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">{ride.from} → {ride.to}</p>
                      <p className="text-sm text-gray-600">{ride.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{ride.fare}</p>
                    <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      {ride.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FaCar className="text-gray-300 text-5xl mb-4 mx-auto" />
              <p className="text-gray-600">No rides yet. Book your first ride!</p>
              <Link
                to="/passenger/book-ride"
                className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Book Now
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PassengerDashboard;