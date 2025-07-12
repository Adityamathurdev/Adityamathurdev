const express = require('express');
const multer = require('multer');
const Joi = require('joi');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const { authenticateToken, requireDriver } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  }
});

// Validation schemas
const driverRegistrationSchema = Joi.object({
  licenseNumber: Joi.string().required(),
  licenseExpiry: Joi.date().required(),
  aadharNumber: Joi.string().length(12).required(),
  panNumber: Joi.string().length(10).required(),
  vehicle: Joi.object({
    type: Joi.string().valid('bike', 'auto', 'car', 'suv').required(),
    make: Joi.string().required(),
    model: Joi.string().required(),
    year: Joi.number().min(1990).max(new Date().getFullYear()).required(),
    color: Joi.string().required(),
    licensePlate: Joi.string().required(),
    registrationNumber: Joi.string().required(),
    registrationExpiry: Joi.date().required(),
    capacity: Joi.number().min(1).max(8).default(4),
    insurance: Joi.object({
      policyNumber: Joi.string().required(),
      provider: Joi.string().required(),
      expiryDate: Joi.date().required()
    }).required()
  }).required(),
  bankDetails: Joi.object({
    accountNumber: Joi.string().required(),
    routingNumber: Joi.string().required(),
    accountHolderName: Joi.string().required(),
    bankName: Joi.string().required()
  }).required()
});

// Register as driver
router.post('/register', authenticateToken, async (req, res) => {
  try {
    // Check if user type is driver
    if (req.user.userType !== 'driver') {
      return res.status(400).json({ error: 'Only driver accounts can register as drivers' });
    }

    // Check if driver already exists
    const existingDriver = await Driver.findOne({ userId: req.user._id });
    if (existingDriver) {
      return res.status(400).json({ error: 'Driver profile already exists' });
    }

    const { error } = driverRegistrationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { licenseNumber, licenseExpiry, aadharNumber, panNumber, vehicle, bankDetails } = req.body;

    // Check if license plate already exists
    const existingVehicle = await Driver.findOne({ 'vehicle.licensePlate': vehicle.licensePlate });
    if (existingVehicle) {
      return res.status(400).json({ error: 'Vehicle with this license plate already registered' });
    }

    // Create driver profile
    const driver = new Driver({
      userId: req.user._id,
      licenseNumber,
      licenseExpiry: new Date(licenseExpiry),
      aadharNumber,
      panNumber,
      vehicle: {
        ...vehicle,
        registrationExpiry: new Date(vehicle.registrationExpiry),
        insurance: {
          ...vehicle.insurance,
          expiryDate: new Date(vehicle.insurance.expiryDate)
        }
      },
      bankDetails,
      approvalStatus: 'pending'
    });

    await driver.save();

    res.status(201).json({
      message: 'Driver registration submitted successfully',
      driver: driver,
      status: 'pending_approval'
    });

  } catch (error) {
    console.error('Driver registration error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'License number or vehicle already registered' });
    }
    res.status(500).json({ error: 'Driver registration failed' });
  }
});

// Upload documents
router.post('/documents/upload', authenticateToken, requireDriver, upload.array('documents', 10), async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedDocuments = [];

    for (const file of req.files) {
      const document = {
        type: file.fieldname,
        url: file.path,
        verified: false,
        uploadedAt: new Date()
      };

      // Remove existing document of same type
      driver.documents = driver.documents.filter(doc => doc.type !== file.fieldname);
      
      // Add new document
      driver.documents.push(document);
      uploadedDocuments.push(document);
    }

    await driver.save();

    res.json({
      message: 'Documents uploaded successfully',
      documents: uploadedDocuments
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to upload documents' });
  }
});

// Get driver profile
router.get('/profile', authenticateToken, requireDriver, async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    res.json({
      driver,
      user: req.user.getPublicProfile()
    });

  } catch (error) {
    console.error('Get driver profile error:', error);
    res.status(500).json({ error: 'Failed to get driver profile' });
  }
});

// Update driver profile
router.put('/profile', authenticateToken, requireDriver, async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    const allowedFields = ['vehicle', 'bankDetails', 'workingHours', 'preferences'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const updatedDriver = await Driver.findByIdAndUpdate(
      driver._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Driver profile updated successfully',
      driver: updatedDriver
    });

  } catch (error) {
    console.error('Update driver profile error:', error);
    res.status(500).json({ error: 'Failed to update driver profile' });
  }
});

// Toggle driver availability
router.put('/availability', authenticateToken, requireDriver, async (req, res) => {
  try {
    const { isAvailable, currentLocation } = req.body;

    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    if (driver.approvalStatus !== 'approved') {
      return res.status(400).json({ error: 'Driver not approved yet' });
    }

    driver.isAvailable = isAvailable;
    driver.isOnline = isAvailable;
    driver.lastActiveAt = new Date();

    if (currentLocation) {
      driver.currentLocation = {
        type: 'Point',
        coordinates: currentLocation
      };
    }

    await driver.save();

    res.json({
      message: `Driver is now ${isAvailable ? 'available' : 'unavailable'}`,
      driver: {
        isAvailable: driver.isAvailable,
        isOnline: driver.isOnline,
        currentLocation: driver.currentLocation
      }
    });

  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// Update driver location
router.put('/location', authenticateToken, requireDriver, async (req, res) => {
  try {
    const { coordinates, heading, speed } = req.body;

    if (!coordinates || coordinates.length !== 2) {
      return res.status(400).json({ error: 'Valid coordinates required' });
    }

    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    driver.currentLocation = {
      type: 'Point',
      coordinates
    };
    driver.lastActiveAt = new Date();

    await driver.save();

    // Emit location update via socket.io
    const io = req.app.get('io');
    if (io && driver.isOnline) {
      io.emit('driverLocationUpdate', {
        driverId: driver._id,
        coordinates,
        heading,
        speed,
        timestamp: new Date()
      });
    }

    res.json({
      message: 'Location updated successfully',
      location: driver.currentLocation
    });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get driver earnings
router.get('/earnings', authenticateToken, requireDriver, async (req, res) => {
  try {
    const { period = 'today' } = req.query;

    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    let earnings = {};
    const now = new Date();

    switch (period) {
      case 'today':
        earnings = { today: driver.earnings.today };
        break;
      case 'week':
        earnings = { thisWeek: driver.earnings.thisWeek };
        break;
      case 'month':
        earnings = { thisMonth: driver.earnings.thisMonth };
        break;
      case 'all':
        earnings = driver.earnings;
        break;
      default:
        earnings = { today: driver.earnings.today };
    }

    // Get recent rides for detailed breakdown
    const recentRides = await Ride.find({
      driver: driver._id,
      status: 'completed',
      completedAt: {
        $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    }).sort({ completedAt: -1 }).limit(10);

    res.json({
      earnings,
      stats: driver.stats,
      recentRides: recentRides.map(ride => ({
        rideId: ride.rideId,
        completedAt: ride.completedAt,
        fare: ride.fare,
        distance: ride.distance,
        duration: ride.actualDuration
      }))
    });

  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ error: 'Failed to get earnings' });
  }
});

// Get driver statistics
router.get('/stats', authenticateToken, requireDriver, async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get detailed statistics
    const monthlyRides = await Ride.countDocuments({
      driver: driver._id,
      status: 'completed',
      completedAt: { $gte: startOfMonth }
    });

    const weeklyRides = await Ride.countDocuments({
      driver: driver._id,
      status: 'completed',
      completedAt: { $gte: startOfWeek }
    });

    const avgRating = await Ride.aggregate([
      { $match: { driver: driver._id, 'rating.passengerRating.rating': { $exists: true } } },
      { $group: { _id: null, avgRating: { $avg: '$rating.passengerRating.rating' } } }
    ]);

    res.json({
      stats: driver.stats,
      monthlyRides,
      weeklyRides,
      averageRating: avgRating[0]?.avgRating || 0,
      earnings: driver.earnings,
      approvalStatus: driver.approvalStatus,
      isOnline: driver.isOnline,
      isAvailable: driver.isAvailable
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Get nearby ride requests
router.get('/nearby-rides', authenticateToken, requireDriver, async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    if (!driver.isAvailableForRides()) {
      return res.status(400).json({ error: 'Driver not available for rides' });
    }

    const maxDistance = driver.preferences.maxDistance * 1000; // Convert to meters
    const nearbyRides = await Ride.find({
      vehicleType: driver.vehicle.type,
      status: 'searching',
      'pickup.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: driver.currentLocation.coordinates
          },
          $maxDistance: maxDistance
        }
      }
    }).populate('passenger', 'name phone rating profilePicture');

    res.json({
      rides: nearbyRides.map(ride => ({
        rideId: ride._id,
        passenger: ride.passenger,
        pickup: ride.pickup,
        destination: ride.destination,
        fare: ride.fare,
        distance: ride.distance,
        estimatedDuration: ride.estimatedDuration,
        specialRequests: ride.specialRequests,
        requestedAt: ride.requestedAt
      }))
    });

  } catch (error) {
    console.error('Get nearby rides error:', error);
    res.status(500).json({ error: 'Failed to get nearby rides' });
  }
});

// Get driver's ride history
router.get('/rides', authenticateToken, requireDriver, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    let query = { driver: driver._id };
    if (status) {
      query.status = status;
    }

    const rides = await Ride.find(query)
      .populate('passenger', 'name phone profilePicture rating')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const totalRides = await Ride.countDocuments(query);

    res.json({
      rides: rides.map(ride => ride.getDriverSummary()),
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalRides / limitNum),
        totalRides,
        hasNext: pageNum < Math.ceil(totalRides / limitNum),
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get driver rides error:', error);
    res.status(500).json({ error: 'Failed to get ride history' });
  }
});

// Update working hours
router.put('/working-hours', authenticateToken, requireDriver, async (req, res) => {
  try {
    const { workingHours } = req.body;

    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    driver.workingHours = workingHours;
    await driver.save();

    res.json({
      message: 'Working hours updated successfully',
      workingHours: driver.workingHours
    });

  } catch (error) {
    console.error('Update working hours error:', error);
    res.status(500).json({ error: 'Failed to update working hours' });
  }
});

module.exports = router;