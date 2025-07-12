const express = require('express');
const Joi = require('joi');
const geolib = require('geolib');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const { authenticateToken, requirePassenger, requireDriver } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const rideRequestSchema = Joi.object({
  pickup: Joi.object({
    address: Joi.string().required(),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    landmark: Joi.string().optional(),
    instructions: Joi.string().optional()
  }).required(),
  destination: Joi.object({
    address: Joi.string().required(),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
    landmark: Joi.string().optional(),
    instructions: Joi.string().optional()
  }).required(),
  vehicleType: Joi.string().valid('bike', 'auto', 'car', 'suv').required(),
  paymentMethod: Joi.string().valid('cash', 'card', 'wallet', 'upi').required(),
  passengers: Joi.object({
    count: Joi.number().min(1).max(6).default(1),
    details: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      phone: Joi.string().required()
    })).optional()
  }).optional(),
  specialRequests: Joi.object({
    acRequired: Joi.boolean().default(false),
    petFriendly: Joi.boolean().default(false),
    wheelchairAccessible: Joi.boolean().default(false),
    silentRide: Joi.boolean().default(false),
    musicPreference: Joi.string().optional(),
    other: Joi.string().optional()
  }).optional(),
  scheduledAt: Joi.date().optional(),
  promoCode: Joi.string().optional()
});

// Calculate distance between two points
function calculateDistance(pickup, destination) {
  return geolib.getDistance(
    { latitude: pickup[1], longitude: pickup[0] },
    { latitude: destination[1], longitude: destination[0] }
  ) / 1000; // Convert to kilometers
}

// Calculate estimated duration (rough estimate)
function calculateEstimatedDuration(distance) {
  const averageSpeed = 25; // km/h
  return Math.ceil((distance / averageSpeed) * 60); // minutes
}

// Get fare configuration based on vehicle type
function getFareConfig(vehicleType) {
  const configs = {
    bike: { baseRate: 20, perKmRate: 8, perMinuteRate: 1, minimumFare: 25 },
    auto: { baseRate: 30, perKmRate: 12, perMinuteRate: 1.5, minimumFare: 40 },
    car: { baseRate: 50, perKmRate: 15, perMinuteRate: 2, minimumFare: 60 },
    suv: { baseRate: 70, perKmRate: 20, perMinuteRate: 2.5, minimumFare: 80 }
  };
  return configs[vehicleType] || configs.car;
}

// Generate OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Request a ride
router.post('/request', authenticateToken, requirePassenger, async (req, res) => {
  try {
    const { error } = rideRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { pickup, destination, vehicleType, paymentMethod, passengers, specialRequests, scheduledAt, promoCode } = req.body;

    // Calculate distance and duration
    const distance = calculateDistance(pickup.coordinates, destination.coordinates);
    const estimatedDuration = calculateEstimatedDuration(distance);

    // Check minimum distance
    if (distance < 0.5) {
      return res.status(400).json({ error: 'Minimum distance is 0.5 km' });
    }

    // Generate OTP
    const otp = generateOTP();

    // Create ride
    const ride = new Ride({
      passenger: req.user._id,
      pickup,
      destination,
      vehicleType,
      paymentMethod,
      distance,
      estimatedDuration,
      otp,
      passengers: passengers || { count: 1 },
      specialRequests: specialRequests || {},
      scheduledAt,
      fare: {
        baseFare: 0,
        distanceFare: 0,
        totalFare: 0
      }
    });

    // Calculate fare
    const fareConfig = getFareConfig(vehicleType);
    const totalFare = ride.calculateFare(fareConfig);

    // Apply promo code if provided
    if (promoCode) {
      // TODO: Implement promo code logic
      ride.promo = { code: promoCode };
    }

    await ride.save();

    // Find nearby drivers
    const maxDistance = 5000; // 5km radius
    const availableDrivers = await Driver.find({
      'vehicle.type': vehicleType,
      isAvailable: true,
      isOnline: true,
      approvalStatus: 'approved',
      backgroundCheckStatus: 'approved',
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: pickup.coordinates
          },
          $maxDistance: maxDistance
        }
      }
    }).populate('userId', 'name phone rating profilePicture');

    if (availableDrivers.length === 0) {
      ride.status = 'cancelled';
      ride.cancellationReason = 'No drivers available';
      await ride.save();
      
      return res.status(400).json({ 
        error: 'No drivers available in your area',
        ride: ride.getPassengerSummary()
      });
    }

    // Update ride status
    ride.status = 'searching';
    await ride.save();

    // Emit ride request to nearby drivers via socket.io
    const io = req.app.get('io');
    if (io) {
      availableDrivers.forEach(driver => {
        io.to(driver.userId._id.toString()).emit('rideRequest', {
          rideId: ride._id,
          passenger: req.user.getPublicProfile(),
          pickup: ride.pickup,
          destination: ride.destination,
          fare: ride.fare,
          distance: ride.distance,
          estimatedDuration: ride.estimatedDuration,
          vehicleType: ride.vehicleType,
          specialRequests: ride.specialRequests,
          otp: ride.otp
        });
      });
    }

    res.status(201).json({
      message: 'Ride requested successfully',
      ride: ride.getPassengerSummary(),
      availableDrivers: availableDrivers.length
    });

  } catch (error) {
    console.error('Ride request error:', error);
    res.status(500).json({ error: 'Failed to request ride' });
  }
});

// Accept ride (driver)
router.post('/:rideId/accept', authenticateToken, requireDriver, async (req, res) => {
  try {
    const { rideId } = req.params;
    const { currentLocation } = req.body;

    const ride = await Ride.findById(rideId).populate('passenger', 'name phone');
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status !== 'searching') {
      return res.status(400).json({ error: 'Ride is not available for acceptance' });
    }

    // Find driver
    const driver = await Driver.findOne({ userId: req.user._id });
    
    if (!driver || !driver.isAvailableForRides()) {
      return res.status(400).json({ error: 'Driver not available' });
    }

    // Check if driver is within acceptable distance
    const driverDistance = geolib.getDistance(
      { latitude: currentLocation[1], longitude: currentLocation[0] },
      { latitude: ride.pickup.coordinates[1], longitude: ride.pickup.coordinates[0] }
    );

    if (driverDistance > 5000) { // 5km
      return res.status(400).json({ error: 'Too far from pickup location' });
    }

    // Update ride
    ride.driver = driver._id;
    ride.status = 'driver_assigned';
    ride.assignedAt = new Date();
    await ride.save();

    // Update driver availability
    driver.isAvailable = false;
    driver.currentLocation = {
      type: 'Point',
      coordinates: currentLocation
    };
    await driver.save();

    // Emit to passenger
    const io = req.app.get('io');
    if (io) {
      io.to(ride.passenger._id.toString()).emit('rideAccepted', {
        rideId: ride._id,
        driver: {
          name: req.user.name,
          phone: req.user.phone,
          rating: driver.stats.rating,
          profilePicture: req.user.profilePicture,
          vehicle: driver.vehicle,
          currentLocation: driver.currentLocation
        },
        estimatedArrival: 5 // minutes
      });

      // Cancel ride request for other drivers
      io.emit('rideCancelled', { rideId: ride._id });
    }

    res.json({
      message: 'Ride accepted successfully',
      ride: ride.getDriverSummary(),
      passenger: ride.passenger
    });

  } catch (error) {
    console.error('Accept ride error:', error);
    res.status(500).json({ error: 'Failed to accept ride' });
  }
});

// Update ride status
router.put('/:rideId/status', authenticateToken, async (req, res) => {
  try {
    const { rideId } = req.params;
    const { status, location } = req.body;

    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Check if user is authorized to update this ride
    const isPassenger = ride.passenger.toString() === req.user._id.toString();
    const isDriver = ride.driver && ride.driver.toString() === req.user._id.toString();

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ error: 'Not authorized to update this ride' });
    }

    // Validate status transitions
    const validTransitions = {
      'searching': ['cancelled'],
      'driver_assigned': ['driver_arrived', 'cancelled'],
      'driver_arrived': ['pickup_confirmed', 'cancelled'],
      'pickup_confirmed': ['in_progress'],
      'in_progress': ['completed'],
      'completed': [],
      'cancelled': []
    };

    if (!validTransitions[ride.status].includes(status)) {
      return res.status(400).json({ error: 'Invalid status transition' });
    }

    // Update ride status
    await ride.updateStatus(status);

    // Update driver location if provided
    if (location && isDriver) {
      await ride.addDriverLocation(location.coordinates, location.heading, location.speed);
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      const updateData = {
        rideId: ride._id,
        status,
        location,
        timestamp: new Date()
      };

      if (isDriver) {
        io.to(ride.passenger.toString()).emit('rideStatusUpdate', updateData);
      } else {
        io.to(ride.driver.toString()).emit('rideStatusUpdate', updateData);
      }
    }

    // Handle specific status updates
    if (status === 'completed') {
      // Update driver availability
      const driver = await Driver.findById(ride.driver);
      if (driver) {
        driver.isAvailable = true;
        driver.stats.totalRides += 1;
        driver.stats.totalDistance += ride.distance;
        await driver.save();
      }

      // Update passenger ride count
      const passenger = await User.findById(ride.passenger);
      if (passenger) {
        passenger.totalRides += 1;
        await passenger.save();
      }
    }

    res.json({
      message: 'Ride status updated successfully',
      ride: isPassenger ? ride.getPassengerSummary() : ride.getDriverSummary()
    });

  } catch (error) {
    console.error('Update ride status error:', error);
    res.status(500).json({ error: 'Failed to update ride status' });
  }
});

// Cancel ride
router.put('/:rideId/cancel', authenticateToken, async (req, res) => {
  try {
    const { rideId } = req.params;
    const { reason } = req.body;

    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Check if user is authorized to cancel this ride
    const isPassenger = ride.passenger.toString() === req.user._id.toString();
    const isDriver = ride.driver && ride.driver.toString() === req.user._id.toString();

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ error: 'Not authorized to cancel this ride' });
    }

    // Check if ride can be cancelled
    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(400).json({ error: 'Cannot cancel completed or already cancelled ride' });
    }

    // Update ride
    ride.status = 'cancelled';
    ride.cancelledAt = new Date();
    ride.cancellationReason = reason || 'No reason provided';
    ride.cancelledBy = req.user.userType;
    await ride.save();

    // Update driver availability if driver was assigned
    if (ride.driver) {
      const driver = await Driver.findById(ride.driver);
      if (driver) {
        driver.isAvailable = true;
        driver.stats.cancelledRides += 1;
        await driver.save();
      }
    }

    // Emit cancellation notification
    const io = req.app.get('io');
    if (io) {
      const targetUserId = isPassenger ? ride.driver : ride.passenger;
      if (targetUserId) {
        io.to(targetUserId.toString()).emit('rideCancelled', {
          rideId: ride._id,
          reason: ride.cancellationReason,
          cancelledBy: ride.cancelledBy
        });
      }
    }

    res.json({
      message: 'Ride cancelled successfully',
      ride: isPassenger ? ride.getPassengerSummary() : ride.getDriverSummary()
    });

  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({ error: 'Failed to cancel ride' });
  }
});

// Get ride details
router.get('/:rideId', authenticateToken, async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId)
      .populate('passenger', 'name phone profilePicture rating')
      .populate('driver', 'userId vehicle stats');

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Check if user is authorized to view this ride
    const isPassenger = ride.passenger._id.toString() === req.user._id.toString();
    const isDriver = ride.driver && ride.driver.userId.toString() === req.user._id.toString();

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ error: 'Not authorized to view this ride' });
    }

    res.json({
      ride: isPassenger ? ride.getPassengerSummary() : ride.getDriverSummary(),
      details: ride
    });

  } catch (error) {
    console.error('Get ride details error:', error);
    res.status(500).json({ error: 'Failed to get ride details' });
  }
});

// Get ride history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    let query = {};
    
    if (req.user.userType === 'passenger') {
      query.passenger = req.user._id;
    } else {
      // For drivers, find their driver record first
      const driver = await Driver.findOne({ userId: req.user._id });
      if (driver) {
        query.driver = driver._id;
      }
    }

    if (status) {
      query.status = status;
    }

    const rides = await Ride.find(query)
      .populate('passenger', 'name phone profilePicture')
      .populate('driver', 'userId vehicle stats')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const totalRides = await Ride.countDocuments(query);

    res.json({
      rides: rides.map(ride => 
        req.user.userType === 'passenger' ? ride.getPassengerSummary() : ride.getDriverSummary()
      ),
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalRides / limitNum),
        totalRides,
        hasNext: pageNum < Math.ceil(totalRides / limitNum),
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get ride history error:', error);
    res.status(500).json({ error: 'Failed to get ride history' });
  }
});

// Rate ride
router.post('/:rideId/rate', authenticateToken, async (req, res) => {
  try {
    const { rideId } = req.params;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status !== 'completed') {
      return res.status(400).json({ error: 'Can only rate completed rides' });
    }

    const isPassenger = ride.passenger.toString() === req.user._id.toString();
    const isDriver = ride.driver && ride.driver.toString() === req.user._id.toString();

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ error: 'Not authorized to rate this ride' });
    }

    // Update rating
    if (isPassenger) {
      if (ride.rating.passengerRating.rating) {
        return res.status(400).json({ error: 'Already rated this ride' });
      }
      
      ride.rating.passengerRating = {
        rating,
        feedback: feedback || '',
        ratedAt: new Date()
      };

      // Update driver rating
      const driver = await Driver.findById(ride.driver);
      if (driver) {
        await driver.updateRating(rating);
      }
    } else {
      if (ride.rating.driverRating.rating) {
        return res.status(400).json({ error: 'Already rated this ride' });
      }
      
      ride.rating.driverRating = {
        rating,
        feedback: feedback || '',
        ratedAt: new Date()
      };

      // Update passenger rating
      const passenger = await User.findById(ride.passenger);
      if (passenger) {
        await passenger.updateRating(rating);
      }
    }

    await ride.save();

    res.json({
      message: 'Rating submitted successfully',
      ride: isPassenger ? ride.getPassengerSummary() : ride.getDriverSummary()
    });

  } catch (error) {
    console.error('Rate ride error:', error);
    res.status(500).json({ error: 'Failed to rate ride' });
  }
});

module.exports = router;