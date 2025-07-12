const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  rideId: {
    type: String,
    unique: true,
    required: true
  },
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'auto', 'car', 'suv'],
    required: true
  },
  pickup: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      index: '2dsphere'
    },
    landmark: String,
    instructions: String
  },
  destination: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      index: '2dsphere'
    },
    landmark: String,
    instructions: String
  },
  waypoints: [{
    address: String,
    coordinates: [Number],
    order: Number
  }],
  distance: {
    type: Number, // in kilometers
    required: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: true
  },
  actualDuration: {
    type: Number // in minutes
  },
  fare: {
    baseFare: { type: Number, required: true },
    distanceFare: { type: Number, required: true },
    timeFare: { type: Number, default: 0 },
    surgeFare: { type: Number, default: 0 },
    surgeMultiplier: { type: Number, default: 1 },
    platformFee: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    tip: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    couponDiscount: { type: Number, default: 0 },
    totalFare: { type: Number, required: true },
    driverEarning: { type: Number },
    platformCommission: { type: Number }
  },
  status: {
    type: String,
    enum: [
      'requested',
      'searching',
      'driver_assigned',
      'driver_arrived',
      'pickup_confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'payment_pending'
    ],
    default: 'requested'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'wallet', 'upi'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: String,
  otp: {
    type: String,
    required: true
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  assignedAt: Date,
  pickedUpAt: Date,
  droppedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  cancelledBy: {
    type: String,
    enum: ['passenger', 'driver', 'admin']
  },
  rating: {
    passengerRating: {
      rating: { type: Number, min: 1, max: 5 },
      feedback: String,
      ratedAt: Date
    },
    driverRating: {
      rating: { type: Number, min: 1, max: 5 },
      feedback: String,
      ratedAt: Date
    }
  },
  route: {
    actualRoute: [{ // Array of coordinates for actual route taken
      coordinates: [Number],
      timestamp: Date
    }],
    estimatedRoute: [{ // Array of coordinates for estimated route
      coordinates: [Number]
    }]
  },
  promo: {
    code: String,
    discount: Number,
    type: String // 'percentage' or 'fixed'
  },
  surge: {
    isActive: { type: Boolean, default: false },
    multiplier: { type: Number, default: 1 },
    reason: String
  },
  passengers: {
    count: { type: Number, default: 1 },
    details: [{
      name: String,
      phone: String
    }]
  },
  specialRequests: {
    acRequired: { type: Boolean, default: false },
    petFriendly: { type: Boolean, default: false },
    wheelchairAccessible: { type: Boolean, default: false },
    silentRide: { type: Boolean, default: false },
    musicPreference: String,
    other: String
  },
  driverLocation: [{ // Real-time driver location updates
    coordinates: [Number],
    timestamp: { type: Date, default: Date.now },
    heading: Number,
    speed: Number
  }],
  notifications: [{
    type: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }],
  metadata: {
    appVersion: String,
    platform: String,
    deviceInfo: String,
    networkType: String
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
rideSchema.index({ 'pickup.coordinates': '2dsphere' });
rideSchema.index({ 'destination.coordinates': '2dsphere' });
rideSchema.index({ passenger: 1, createdAt: -1 });
rideSchema.index({ driver: 1, createdAt: -1 });
rideSchema.index({ status: 1, createdAt: -1 });
rideSchema.index({ requestedAt: -1 });

// Generate unique ride ID
rideSchema.pre('save', function(next) {
  if (!this.rideId) {
    this.rideId = 'RIDE' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

// Calculate fare based on distance and time
rideSchema.methods.calculateFare = function(baseFareConfig) {
  const { baseRate, perKmRate, perMinuteRate, minimumFare } = baseFareConfig;
  
  this.fare.baseFare = baseRate;
  this.fare.distanceFare = this.distance * perKmRate;
  this.fare.timeFare = this.estimatedDuration * perMinuteRate;
  
  let subtotal = this.fare.baseFare + this.fare.distanceFare + this.fare.timeFare;
  
  // Apply surge pricing
  if (this.surge.isActive) {
    this.fare.surgeFare = subtotal * (this.surge.multiplier - 1);
    subtotal += this.fare.surgeFare;
  }
  
  // Apply platform fee and taxes
  this.fare.platformFee = Math.round(subtotal * 0.05); // 5% platform fee
  this.fare.taxes = Math.round(subtotal * 0.18); // 18% GST
  
  // Calculate total before discounts
  let total = subtotal + this.fare.platformFee + this.fare.taxes;
  
  // Apply discounts
  total -= (this.fare.discount + this.fare.couponDiscount);
  
  // Ensure minimum fare
  total = Math.max(total, minimumFare);
  
  this.fare.totalFare = Math.round(total);
  this.fare.driverEarning = Math.round(this.fare.totalFare * 0.8); // 80% to driver
  this.fare.platformCommission = this.fare.totalFare - this.fare.driverEarning;
  
  return this.fare.totalFare;
};

// Update ride status with timestamp
rideSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  
  switch (newStatus) {
    case 'driver_assigned':
      this.assignedAt = new Date();
      break;
    case 'pickup_confirmed':
      this.pickedUpAt = new Date();
      break;
    case 'completed':
      this.completedAt = new Date();
      this.droppedAt = new Date();
      break;
    case 'cancelled':
      this.cancelledAt = new Date();
      break;
  }
  
  return this.save();
};

// Add driver location update
rideSchema.methods.addDriverLocation = function(coordinates, heading, speed) {
  this.driverLocation.push({
    coordinates,
    heading,
    speed,
    timestamp: new Date()
  });
  
  // Keep only last 50 location updates
  if (this.driverLocation.length > 50) {
    this.driverLocation = this.driverLocation.slice(-50);
  }
  
  return this.save();
};

// Get ride summary for passenger
rideSchema.methods.getPassengerSummary = function() {
  return {
    rideId: this.rideId,
    pickup: this.pickup,
    destination: this.destination,
    fare: this.fare,
    status: this.status,
    driver: this.driver,
    vehicleType: this.vehicleType,
    estimatedDuration: this.estimatedDuration,
    otp: this.otp,
    createdAt: this.createdAt
  };
};

// Get ride summary for driver
rideSchema.methods.getDriverSummary = function() {
  return {
    rideId: this.rideId,
    pickup: this.pickup,
    destination: this.destination,
    fare: this.fare,
    status: this.status,
    passenger: this.passenger,
    distance: this.distance,
    estimatedDuration: this.estimatedDuration,
    otp: this.otp,
    specialRequests: this.specialRequests,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Ride', rideSchema);