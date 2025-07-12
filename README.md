# RideShare - Complete Ride Sharing Application

A full-stack ride-sharing application similar to Uber, Ola, and Rapido, built with modern web technologies.

## 🚀 Features

### For Passengers
- **Easy Registration & Authentication** - Sign up and login with email/phone
- **Real-time Ride Booking** - Book rides with multiple vehicle options (Bike, Auto, Car, SUV)
- **Live Location Tracking** - Real-time GPS tracking of your ride
- **Multiple Payment Options** - Cash, Card, UPI, and Wallet payments
- **Ride History** - View past rides and download receipts
- **Rating & Reviews** - Rate drivers and provide feedback
- **Emergency Features** - Emergency contact and SOS functionality
- **Promo Codes** - Apply discount codes for cheaper rides

### For Drivers
- **Driver Registration** - Complete verification process with document upload
- **Real-time Ride Requests** - Get notified of nearby ride requests
- **Earnings Tracking** - View daily, weekly, and monthly earnings
- **Vehicle Management** - Manage vehicle details and documents
- **Availability Control** - Go online/offline as needed
- **Navigation Support** - Integrated maps for route guidance
- **Driver Analytics** - Performance metrics and statistics

### Admin Features
- **User Management** - Manage passengers and drivers
- **Ride Monitoring** - Real-time ride tracking and management
- **Payment Processing** - Handle payments and refunds
- **Analytics Dashboard** - Business insights and reports
- **Document Verification** - Approve/reject driver applications

## 🛠️ Technology Stack

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **MongoDB** - Database
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **Stripe** - Payment processing
- **Multer** - File uploads
- **Nodemailer** - Email service

### Frontend
- **React.js** - Frontend library
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Query** - Data fetching
- **Socket.io Client** - Real-time features
- **React Hook Form** - Form handling
- **Framer Motion** - Animations

### Additional Services
- **Google Maps API** - Maps and location services
- **Firebase** - Push notifications
- **AWS S3** - File storage
- **Redis** - Caching (optional)

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/ride-sharing-app.git
cd ride-sharing-app
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create uploads directories
mkdir -p uploads/documents uploads/profiles

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the server
npm run dev
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

### 4. Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/ridesharing

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=30d

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Stripe
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Google Maps
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# File Upload
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=5242880

# Other Services
FCM_SERVER_KEY=your-fcm-server-key
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name
```

## 🚀 Usage

### Starting the Application

1. **Start MongoDB** (if using local installation)
```bash
mongod
```

2. **Start the Backend Server**
```bash
cd backend
npm run dev
```

3. **Start the Frontend Application**
```bash
cd frontend
npm start
```

4. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/api-docs

### User Roles

#### Passenger Flow
1. Register as a passenger
2. Set pickup and destination locations
3. Choose vehicle type
4. Book ride and wait for driver
5. Track ride in real-time
6. Complete payment
7. Rate the driver

#### Driver Flow
1. Register as a driver
2. Upload required documents
3. Wait for admin approval
4. Go online to receive ride requests
5. Accept ride requests
6. Navigate to pickup location
7. Complete the ride
8. Receive payment

## 📱 Mobile App

The application is responsive and works well on mobile devices. For native mobile apps:

- **React Native** version coming soon
- **Flutter** version in development

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Rate Limiting** - Prevents API abuse
- **Input Validation** - Joi schema validation
- **File Upload Security** - Secure file handling
- **CORS Protection** - Cross-origin request security
- **Helmet.js** - Security headers
- **Password Hashing** - Bcrypt encryption

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📊 API Documentation

The API documentation is available at `/api-docs` when the server is running. It includes:

- Authentication endpoints
- User management
- Ride booking and tracking
- Payment processing
- Driver management
- File upload endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Support

For support, email worldpython891@gmail.com or join our Slack channel.

## 🎯 Roadmap

- [ ] Native mobile apps (React Native/Flutter)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Voice commands
- [ ] AI-powered route optimization
- [ ] Electric vehicle support
- [ ] Subscription plans
- [ ] Corporate booking features

## 🙏 Acknowledgments

- Thanks to all contributors who helped build this application
- Inspired by successful ride-sharing platforms
- Built with love for the developer community

## 📸 Screenshots

### Landing Page
![Landing Page](screenshots/landing-page.png)

### Passenger Dashboard
![Passenger Dashboard](screenshots/passenger-dashboard.png)

### Driver Dashboard
![Driver Dashboard](screenshots/driver-dashboard.png)

### Ride Tracking
![Ride Tracking](screenshots/ride-tracking.png)

---

**Built with ❤️ by [Adityamathurdev](https://github.com/Adityamathurdev)**