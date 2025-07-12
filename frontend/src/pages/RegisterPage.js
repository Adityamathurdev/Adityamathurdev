import React from 'react';
import { Link } from 'react-router-dom';
import { FaCar } from 'react-icons/fa';

const RegisterPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <FaCar className="text-6xl text-blue-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
          <p className="text-gray-600">Join RideShare today</p>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-center text-gray-600 mb-4">
            Registration form coming soon...
          </p>
          
          <div className="text-center">
            <Link 
              to="/login" 
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;