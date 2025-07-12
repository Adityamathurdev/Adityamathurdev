const express = require('express');
const multer = require('multer');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG files are allowed'));
    }
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({ user: req.user.getPublicProfile() });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update profile picture
router.post('/profile-picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = await User.findById(req.user._id);
    user.profilePicture = req.file.path;
    await user.save();

    res.json({
      message: 'Profile picture updated successfully',
      profilePicture: user.profilePicture
    });

  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({ error: 'Failed to update profile picture' });
  }
});

// Add emergency contact
router.post('/emergency-contact', authenticateToken, async (req, res) => {
  try {
    const { name, phone, relationship } = req.body;

    if (!name || !phone || !relationship) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user = await User.findById(req.user._id);
    user.emergencyContact = { name, phone, relationship };
    await user.save();

    res.json({
      message: 'Emergency contact added successfully',
      emergencyContact: user.emergencyContact
    });

  } catch (error) {
    console.error('Add emergency contact error:', error);
    res.status(500).json({ error: 'Failed to add emergency contact' });
  }
});

// Add payment method
router.post('/payment-methods', authenticateToken, async (req, res) => {
  try {
    const { type, details, isDefault } = req.body;

    if (!type || !details) {
      return res.status(400).json({ error: 'Payment method type and details are required' });
    }

    const user = await User.findById(req.user._id);
    
    // If this is set as default, remove default from others
    if (isDefault) {
      user.paymentMethods.forEach(method => {
        method.isDefault = false;
      });
    }

    user.paymentMethods.push({ type, details, isDefault });
    await user.save();

    res.json({
      message: 'Payment method added successfully',
      paymentMethods: user.paymentMethods
    });

  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({ error: 'Failed to add payment method' });
  }
});

// Get payment methods
router.get('/payment-methods', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ paymentMethods: user.paymentMethods });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to get payment methods' });
  }
});

// Update payment method
router.put('/payment-methods/:methodId', authenticateToken, async (req, res) => {
  try {
    const { methodId } = req.params;
    const { isDefault } = req.body;

    const user = await User.findById(req.user._id);
    const method = user.paymentMethods.id(methodId);

    if (!method) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    if (isDefault) {
      user.paymentMethods.forEach(m => {
        m.isDefault = false;
      });
      method.isDefault = true;
    }

    await user.save();

    res.json({
      message: 'Payment method updated successfully',
      paymentMethods: user.paymentMethods
    });

  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({ error: 'Failed to update payment method' });
  }
});

// Delete payment method
router.delete('/payment-methods/:methodId', authenticateToken, async (req, res) => {
  try {
    const { methodId } = req.params;

    const user = await User.findById(req.user._id);
    user.paymentMethods.id(methodId).remove();
    await user.save();

    res.json({
      message: 'Payment method removed successfully',
      paymentMethods: user.paymentMethods
    });

  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    let stats = {
      totalRides: user.totalRides,
      rating: user.rating,
      totalRatings: user.totalRatings,
      memberSince: user.createdAt
    };

    // Get ride-specific stats
    const rideStats = await Ride.aggregate([
      { $match: { passenger: req.user._id, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalDistance: { $sum: '$distance' },
          totalAmount: { $sum: '$fare.totalFare' },
          averageRating: { $avg: '$rating.driverRating.rating' }
        }
      }
    ]);

    if (rideStats.length > 0) {
      stats = {
        ...stats,
        totalDistance: rideStats[0].totalDistance,
        totalAmount: rideStats[0].totalAmount,
        averageRating: rideStats[0].averageRating
      };
    }

    res.json({ stats });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

// Search users (for admin purposes)
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q, type, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    let query = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ]
    };

    if (type) {
      query.userType = type;
    }

    const users = await User.find(query)
      .select('-password -resetPasswordToken -verificationToken')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const totalUsers = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalUsers / limitNum),
        totalUsers,
        hasNext: pageNum < Math.ceil(totalUsers / limitNum),
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get user details by ID
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password -resetPasswordToken -verificationToken');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let additionalInfo = {};
    
    if (user.userType === 'driver') {
      const driver = await Driver.findOne({ userId: user._id });
      additionalInfo.driver = driver;
    }

    res.json({
      user: user.getPublicProfile(),
      ...additionalInfo
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

// Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { preferences } = req.body;

    const user = await User.findById(req.user._id);
    user.preferences = { ...user.preferences, ...preferences };
    await user.save();

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Deactivate account
router.put('/deactivate', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.isActive = false;
    await user.save();

    res.json({ message: 'Account deactivated successfully' });

  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({ error: 'Failed to deactivate account' });
  }
});

// Report user
router.post('/report/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    // In a real application, you would save this to a reports collection
    console.log('User report:', {
      reportedBy: req.user._id,
      reportedUser: userId,
      reason,
      description,
      timestamp: new Date()
    });

    res.json({ message: 'Report submitted successfully' });

  } catch (error) {
    console.error('Report user error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

module.exports = router;