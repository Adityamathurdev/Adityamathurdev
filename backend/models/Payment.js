const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true,
    required: true
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'wallet', 'upi', 'net_banking'],
    required: true
  },
  paymentProvider: {
    type: String,
    enum: ['stripe', 'razorpay', 'paytm', 'phonepe', 'googlepay', 'cash'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  transactionId: String, // External payment gateway transaction ID
  gatewayResponse: mongoose.Schema.Types.Mixed,
  breakdown: {
    rideFare: Number,
    tip: Number,
    taxes: Number,
    platformFee: Number,
    discount: Number,
    couponDiscount: Number,
    surgeFare: Number,
    total: Number
  },
  driverEarning: {
    amount: Number,
    commission: Number,
    netEarning: Number
  },
  refund: {
    amount: Number,
    reason: String,
    refundId: String,
    processedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed']
    }
  },
  paymentAttempts: [{
    attemptedAt: { type: Date, default: Date.now },
    method: String,
    status: String,
    errorMessage: String,
    gatewayResponse: mongoose.Schema.Types.Mixed
  }],
  invoice: {
    invoiceNumber: String,
    generatedAt: Date,
    url: String
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceId: String,
    appVersion: String
  },
  processedAt: Date,
  completedAt: Date,
  failedAt: Date,
  cancelledAt: Date
}, {
  timestamps: true
});

// Create indexes
paymentSchema.index({ rideId: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ driverId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ paymentId: 1 });

// Generate unique payment ID
paymentSchema.pre('save', function(next) {
  if (!this.paymentId) {
    this.paymentId = 'PAY' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

// Update payment status with timestamp
paymentSchema.methods.updateStatus = function(newStatus, gatewayResponse = null) {
  this.status = newStatus;
  
  if (gatewayResponse) {
    this.gatewayResponse = gatewayResponse;
  }
  
  switch (newStatus) {
    case 'processing':
      this.processedAt = new Date();
      break;
    case 'completed':
      this.completedAt = new Date();
      break;
    case 'failed':
      this.failedAt = new Date();
      break;
    case 'cancelled':
      this.cancelledAt = new Date();
      break;
  }
  
  return this.save();
};

// Add payment attempt
paymentSchema.methods.addPaymentAttempt = function(method, status, errorMessage = null, gatewayResponse = null) {
  this.paymentAttempts.push({
    method,
    status,
    errorMessage,
    gatewayResponse,
    attemptedAt: new Date()
  });
  
  return this.save();
};

// Process refund
paymentSchema.methods.processRefund = function(amount, reason, refundId) {
  this.refund = {
    amount,
    reason,
    refundId,
    processedAt: new Date(),
    status: 'pending'
  };
  
  this.status = 'refunded';
  return this.save();
};

// Get payment summary
paymentSchema.methods.getPaymentSummary = function() {
  return {
    paymentId: this.paymentId,
    amount: this.amount,
    currency: this.currency,
    paymentMethod: this.paymentMethod,
    status: this.status,
    breakdown: this.breakdown,
    createdAt: this.createdAt,
    completedAt: this.completedAt
  };
};

module.exports = mongoose.model('Payment', paymentSchema);