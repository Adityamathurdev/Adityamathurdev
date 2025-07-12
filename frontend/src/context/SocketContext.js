import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize socket connection
      const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
        auth: {
          userId: user._id,
          userType: user.userType
        }
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
        
        // Join user to their specific room
        newSocket.emit('join', {
          userId: user._id,
          userType: user.userType,
          location: user.location?.coordinates || null
        });
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setIsConnected(false);
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.close();
      };
    } else if (socket) {
      // Disconnect socket if user is not authenticated
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [isAuthenticated, user]);

  // Socket event handlers
  const emit = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  // Driver-specific functions
  const updateLocation = (location) => {
    if (socket && isConnected && user?.userType === 'driver') {
      socket.emit('updateLocation', {
        userId: user._id,
        location
      });
    }
  };

  const acceptRide = (rideData) => {
    if (socket && isConnected && user?.userType === 'driver') {
      socket.emit('acceptRide', rideData);
    }
  };

  // Passenger-specific functions
  const requestRide = (rideData) => {
    if (socket && isConnected && user?.userType === 'passenger') {
      socket.emit('requestRide', rideData);
    }
  };

  // Common functions
  const updateTripStatus = (updateData) => {
    if (socket && isConnected) {
      socket.emit('tripUpdate', updateData);
    }
  };

  const completePayment = (paymentData) => {
    if (socket && isConnected) {
      socket.emit('paymentCompleted', paymentData);
    }
  };

  const value = {
    socket,
    isConnected,
    emit,
    on,
    off,
    updateLocation,
    acceptRide,
    requestRide,
    updateTripStatus,
    completePayment
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};