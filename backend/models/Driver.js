const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  licenseExpiry: {
    type: Date,
    required: true
  },
  licenseImage: {
    type: String,
    required: true
  },
  aadharNumber: {
    type: String,
    required: true
  },
  panNumber: {
    type: String,
    required: true
  },
  backgroundCheckStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  vehicle: {
    type: {
      type: String,
      enum: ['bike', 'auto', 'car', 'suv'],
      required: true
    },
    make: {
      type: String,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      required: true
    },
    color: {
      type: String,
      required: true
    },
    licensePlate: {
      type: String,
      required: true,
      unique: true
    },
    registrationNumber: {
      type: String,
      required: true
    },
    registrationExpiry: {
      type: Date,
      required: true
    },
    insurance: {
      policyNumber: String,
      provider: String,
      expiryDate: Date
    },
    images: [String], // Array of vehicle image URLs
    capacity: {
      type: Number,
      default: 4
    }
  },
  earnings: {
    today: { type: Number, default: 0 },
    thisWeek: { type: Number, default: 0 },
    thisMonth: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  stats: {
    totalRides: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 }, // in kilometers
    totalHours: { type: Number, default: 0 },
    cancelledRides: { type: Number, default: 0 },
    acceptanceRate: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 }
  },
  bankDetails: {
    accountNumber: String,
    routingNumber: String,
    accountHolderName: String,
    bankName: String,
    verified: { type: Boolean, default: false }
  },
  workingHours: {
    monday: { start: String, end: String, isWorking: Boolean },
    tuesday: { start: String, end: String, isWorking: Boolean },
    wednesday: { start: String, end: String, isWorking: Boolean },
    thursday: { start: String, end: String, isWorking: Boolean },
    friday: { start: String, end: String, isWorking: Boolean },
    saturday: { start: String, end: String, isWorking: Boolean },
    sunday: { start: String, end: String, isWorking: Boolean }
  },
  preferences: {
    maxDistance: { type: Number, default: 50 }, // in kilometers
    acceptCash: { type: Boolean, default: true },
    acceptCard: { type: Boolean, default: true },
    preferredAreas: [String],
    autoAcceptRides: { type: Boolean, default: false }
  },
  documents: [{
    type: {
      type: String,
      enum: ['license', 'registration', 'insurance', 'aadhar', 'pan', 'photo']
    },
    url: String,
    verified: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now }
  }],
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  approvedAt: Date,
  rejectionReason: String,
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create index for location-based queries
driverSchema.index({ currentLocation: '2dsphere' });
driverSchema.index({ 'vehicle.licensePlate': 1 });
driverSchema.index({ isAvailable: 1, isOnline: 1 });

// Update driver rating
driverSchema.methods.updateRating = function(newRating) {
  this.stats.totalRatings += 1;
  this.stats.rating = ((this.stats.rating * (this.stats.totalRatings - 1)) + newRating) / this.stats.totalRatings;
  return this.save();
};

// Update earnings
driverSchema.methods.updateEarnings = function(amount) {
  this.earnings.today += amount;
  this.earnings.thisWeek += amount;
  this.earnings.thisMonth += amount;
  this.earnings.total += amount;
  return this.save();
};

// Check if driver is available for rides
driverSchema.methods.isAvailableForRides = function() {
  return this.isAvailable && 
         this.isOnline && 
         this.approvalStatus === 'approved' &&
         this.backgroundCheckStatus === 'approved';
};

// Get driver's public info for passengers
driverSchema.methods.getPublicInfo = function() {
  return {
    _id: this._id,
    vehicle: this.vehicle,
    rating: this.stats.rating,
    totalRides: this.stats.totalRides,
    currentLocation: this.currentLocation
  };
};

module.exports = mongoose.model('Driver', driverSchema);