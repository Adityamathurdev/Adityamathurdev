const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const http = require('http');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const rideRoutes = require('./routes/rides');
const driverRoutes = require('./routes/drivers');
const paymentRoutes = require('./routes/payments');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ridesharing', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/payments', paymentRoutes);

// Socket.io for real-time features
const activeUsers = new Map();
const activeDrivers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins
  socket.on('join', ({ userId, userType, location }) => {
    socket.join(userId);
    
    if (userType === 'driver') {
      activeDrivers.set(userId, {
        socketId: socket.id,
        location,
        available: true,
        lastSeen: new Date()
      });
    } else {
      activeUsers.set(userId, {
        socketId: socket.id,
        location,
        lastSeen: new Date()
      });
    }
    
    console.log(`${userType} ${userId} joined`);
  });

  // Driver location update
  socket.on('updateLocation', ({ userId, location }) => {
    if (activeDrivers.has(userId)) {
      const driver = activeDrivers.get(userId);
      driver.location = location;
      driver.lastSeen = new Date();
      activeDrivers.set(userId, driver);
      
      // Broadcast to nearby users looking for rides
      socket.broadcast.emit('driverLocationUpdate', { userId, location });
    }
  });

  // Ride request
  socket.on('requestRide', async (rideData) => {
    // Find nearby drivers
    const nearbyDrivers = Array.from(activeDrivers.entries())
      .filter(([driverId, driver]) => driver.available)
      .map(([driverId, driver]) => ({
        driverId,
        ...driver
      }));

    // Send ride request to nearby drivers
    nearbyDrivers.forEach(driver => {
      io.to(driver.socketId).emit('rideRequest', rideData);
    });
  });

  // Driver accepts ride
  socket.on('acceptRide', (rideData) => {
    const { rideId, driverId, userId } = rideData;
    
    // Update driver availability
    if (activeDrivers.has(driverId)) {
      const driver = activeDrivers.get(driverId);
      driver.available = false;
      activeDrivers.set(driverId, driver);
    }
    
    // Notify user
    io.to(userId).emit('rideAccepted', rideData);
    
    // Cancel requests to other drivers
    socket.broadcast.emit('rideCancelled', { rideId });
  });

  // Trip updates
  socket.on('tripUpdate', (updateData) => {
    const { rideId, status, location } = updateData;
    socket.broadcast.emit('tripStatusUpdate', updateData);
  });

  // Payment completed
  socket.on('paymentCompleted', (paymentData) => {
    const { rideId, driverId, userId } = paymentData;
    
    // Update driver availability
    if (activeDrivers.has(driverId)) {
      const driver = activeDrivers.get(driverId);
      driver.available = true;
      activeDrivers.set(driverId, driver);
    }
    
    io.to(userId).emit('paymentSuccess', paymentData);
    io.to(driverId).emit('paymentReceived', paymentData);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove from active users/drivers
    for (const [userId, user] of activeUsers.entries()) {
      if (user.socketId === socket.id) {
        activeUsers.delete(userId);
        break;
      }
    }
    
    for (const [driverId, driver] of activeDrivers.entries()) {
      if (driver.socketId === socket.id) {
        activeDrivers.delete(driverId);
        break;
      }
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    activeUsers: activeUsers.size,
    activeDrivers: activeDrivers.size
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io };