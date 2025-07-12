import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaCar, 
  FaMotorcycle, 
  FaShieldAlt, 
  FaClock, 
  FaMapMarkerAlt, 
  FaStar,
  FaArrowRight,
  FaPlay
} from 'react-icons/fa';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <FaCar className="text-3xl text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">RideShare</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                to="/login" 
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <motion.h1 
              className="text-5xl md:text-6xl font-bold text-gray-900 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Your Ride,
              <span className="text-blue-600"> Your Way</span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Experience the fastest, safest, and most convenient ride-sharing service. 
              Book rides in seconds, track in real-time, and travel with confidence.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Link 
                to="/register?type=passenger" 
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                Book a Ride
                <FaArrowRight className="ml-2" />
              </Link>
              <Link 
                to="/register?type=driver" 
                className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors border-2 border-blue-600 flex items-center justify-center"
              >
                Drive & Earn
                <FaCar className="ml-2" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose RideShare?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We provide the best ride-sharing experience with cutting-edge technology 
              and unmatched safety standards.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                className="text-center p-8 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="text-4xl text-blue-600 mb-4 flex justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Vehicle Types Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Ride
            </h2>
            <p className="text-xl text-gray-600">
              From bikes to SUVs, we have the perfect ride for every need
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {vehicleTypes.map((vehicle, index) => (
              <motion.div 
                key={index}
                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="text-3xl text-blue-600 mb-4">
                  {vehicle.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {vehicle.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {vehicle.description}
                </p>
                <p className="text-blue-600 font-semibold">
                  Starting at ₹{vehicle.price}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of satisfied customers who trust RideShare
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/register?type=passenger" 
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Start Riding
            </Link>
            <Link 
              to="/register?type=driver" 
              className="bg-transparent text-white px-8 py-4 rounded-lg text-lg font-semibold border-2 border-white hover:bg-white hover:text-blue-600 transition-colors"
            >
              Start Driving
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <FaCar className="text-2xl text-blue-400 mr-2" />
                <h3 className="text-xl font-bold">RideShare</h3>
              </div>
              <p className="text-gray-400">
                Your trusted ride-sharing partner for safe, convenient, and affordable transportation.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Press</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Safety</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Download App</h4>
              <p className="text-gray-400 mb-4">
                Get the RideShare app for the best experience
              </p>
              <div className="flex space-x-2">
                <button className="bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                  App Store
                </button>
                <button className="bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                  Google Play
                </button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 RideShare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const features = [
  {
    icon: <FaShieldAlt />,
    title: "100% Safe",
    description: "All drivers are verified with background checks and safety training"
  },
  {
    icon: <FaClock />,
    title: "Quick Booking",
    description: "Book a ride in seconds with our user-friendly app interface"
  },
  {
    icon: <FaMapMarkerAlt />,
    title: "Real-time Tracking",
    description: "Track your ride in real-time and share your location with family"
  },
  {
    icon: <FaStar />,
    title: "Rated Service",
    description: "Rate and review your experience to help maintain quality service"
  },
  {
    icon: <FaCar />,
    title: "Multiple Options",
    description: "Choose from bikes, autos, cars, and SUVs based on your needs"
  },
  {
    icon: <FaPlay />,
    title: "24/7 Support",
    description: "Round-the-clock customer support for all your ride needs"
  }
];

const vehicleTypes = [
  {
    icon: <FaMotorcycle />,
    name: "Bike",
    description: "Quick & affordable rides for short distances",
    price: "8"
  },
  {
    icon: <FaCar />,
    name: "Auto",
    description: "Comfortable 3-wheeler for city rides",
    price: "12"
  },
  {
    icon: <FaCar />,
    name: "Car",
    description: "Sedan rides for comfort and style",
    price: "15"
  },
  {
    icon: <FaCar />,
    name: "SUV",
    description: "Spacious rides for groups and families",
    price: "20"
  }
];

export default LandingPage;