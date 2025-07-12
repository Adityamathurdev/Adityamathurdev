import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaCar } from 'react-icons/fa';

const BookRide = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/passenger" className="mr-4">
              <FaArrowLeft className="text-gray-600 hover:text-gray-900" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Book a Ride</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FaCar className="text-5xl text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Book Your Ride</h2>
          <p className="text-gray-600 mb-6">
            Ride booking feature coming soon...
          </p>
          <Link
            to="/passenger"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
};

export default BookRide;