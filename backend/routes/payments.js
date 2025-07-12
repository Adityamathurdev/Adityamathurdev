const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create payment intent
router.post('/create-intent', authenticateToken, async (req, res) => {
  try {
    const { rideId, amount, currency = 'inr' } = req.body;

    if (!rideId || !amount) {
      return res.status(400).json({ error: 'Ride ID and amount are required' });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        rideId: rideId,
        userId: req.user._id.toString()
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Process payment
router.post('/process', authenticateToken, async (req, res) => {
  try {
    const { rideId, paymentIntentId, paymentMethod } = req.body;

    if (!rideId || !paymentIntentId) {
      return res.status(400).json({ error: 'Ride ID and payment intent ID are required' });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not successful' });
    }

    // Create payment record
    const payment = new Payment({
      rideId: ride._id,
      userId: req.user._id,
      driverId: ride.driver,
      amount: ride.fare.totalFare,
      currency: 'INR',
      paymentMethod: paymentMethod || 'card',
      paymentProvider: 'stripe',
      status: 'completed',
      transactionId: paymentIntent.id,
      gatewayResponse: paymentIntent,
      breakdown: {
        rideFare: ride.fare.baseFare + ride.fare.distanceFare + ride.fare.timeFare,
        tip: ride.fare.tip,
        taxes: ride.fare.taxes,
        platformFee: ride.fare.platformFee,
        discount: ride.fare.discount + ride.fare.couponDiscount,
        surgeFare: ride.fare.surgeFare,
        total: ride.fare.totalFare
      },
      driverEarning: {
        amount: ride.fare.driverEarning,
        commission: ride.fare.platformCommission,
        netEarning: ride.fare.driverEarning
      }
    });

    await payment.save();

    // Update ride payment status
    ride.paymentStatus = 'completed';
    ride.paymentId = payment._id;
    await ride.save();

    // Update driver earnings
    const driver = await Driver.findById(ride.driver);
    if (driver) {
      await driver.updateEarnings(ride.fare.driverEarning);
    }

    res.json({
      message: 'Payment processed successfully',
      payment: payment.getPaymentSummary(),
      ride: ride.getPassengerSummary()
    });

  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// Cash payment confirmation
router.post('/cash-payment', authenticateToken, async (req, res) => {
  try {
    const { rideId, amount } = req.body;

    if (!rideId || !amount) {
      return res.status(400).json({ error: 'Ride ID and amount are required' });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Create payment record for cash payment
    const payment = new Payment({
      rideId: ride._id,
      userId: req.user._id,
      driverId: ride.driver,
      amount: amount,
      currency: 'INR',
      paymentMethod: 'cash',
      paymentProvider: 'cash',
      status: 'completed',
      breakdown: {
        rideFare: ride.fare.baseFare + ride.fare.distanceFare + ride.fare.timeFare,
        tip: ride.fare.tip,
        taxes: ride.fare.taxes,
        platformFee: ride.fare.platformFee,
        discount: ride.fare.discount + ride.fare.couponDiscount,
        surgeFare: ride.fare.surgeFare,
        total: ride.fare.totalFare
      },
      driverEarning: {
        amount: ride.fare.driverEarning,
        commission: ride.fare.platformCommission,
        netEarning: ride.fare.driverEarning
      }
    });

    await payment.save();

    // Update ride payment status
    ride.paymentStatus = 'completed';
    ride.paymentId = payment._id;
    await ride.save();

    // Update driver earnings
    const driver = await Driver.findById(ride.driver);
    if (driver) {
      await driver.updateEarnings(ride.fare.driverEarning);
    }

    res.json({
      message: 'Cash payment confirmed',
      payment: payment.getPaymentSummary(),
      ride: ride.getPassengerSummary()
    });

  } catch (error) {
    console.error('Cash payment error:', error);
    res.status(500).json({ error: 'Failed to process cash payment' });
  }
});

// Get payment history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const payments = await Payment.find({ userId: req.user._id })
      .populate('rideId', 'rideId pickup destination createdAt')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const totalPayments = await Payment.countDocuments({ userId: req.user._id });

    res.json({
      payments: payments.map(payment => payment.getPaymentSummary()),
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalPayments / limitNum),
        totalPayments,
        hasNext: pageNum < Math.ceil(totalPayments / limitNum),
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

// Get payment details
router.get('/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId)
      .populate('rideId', 'rideId pickup destination createdAt')
      .populate('userId', 'name email phone')
      .populate('driverId', 'userId vehicle');

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if user is authorized to view this payment
    if (payment.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to view this payment' });
    }

    res.json({ payment });

  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json({ error: 'Failed to get payment details' });
  }
});

// Request refund
router.post('/:paymentId/refund', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if user is authorized
    if (payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to refund this payment' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ error: 'Can only refund completed payments' });
    }

    const refundAmount = amount || payment.amount;

    // Process refund with Stripe if it was a card payment
    if (payment.paymentProvider === 'stripe' && payment.transactionId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: payment.transactionId,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: 'requested_by_customer'
        });

        await payment.processRefund(refundAmount, reason, refund.id);
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError);
        return res.status(500).json({ error: 'Failed to process refund with payment provider' });
      }
    } else {
      // For cash payments, just update the record
      await payment.processRefund(refundAmount, reason, null);
    }

    res.json({
      message: 'Refund processed successfully',
      payment: payment.getPaymentSummary()
    });

  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Webhook for Stripe events
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);
      
      // Update payment status if needed
      const payment = await Payment.findOne({ transactionId: paymentIntent.id });
      if (payment) {
        payment.status = 'completed';
        payment.completedAt = new Date();
        await payment.save();
      }
      break;
      
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      
      // Update payment status
      const failedPaymentRecord = await Payment.findOne({ transactionId: failedPayment.id });
      if (failedPaymentRecord) {
        failedPaymentRecord.status = 'failed';
        failedPaymentRecord.failedAt = new Date();
        await failedPaymentRecord.save();
      }
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

module.exports = router;