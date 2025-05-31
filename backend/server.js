const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://social-meadia.vercel.app', 'https://social-media-frontend-fnjj.vercel.app']
    : ['http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle JSON and URL-encoded data for non-multipart requests
app.use((req, res, next) => {
  if (!req.is('multipart/form-data')) {
    express.json()(req, res, next);
  } else {
    next();
  }
});
app.use((req, res, next) => {
  if (!req.is('multipart/form-data')) {
    express.urlencoded({ extended: true })(req, res, next);
  } else {
    next();
  }
});

// Ensure uploads directory exists with proper permissions
const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
  }
  // Check if directory is writable
  fs.accessSync(uploadsDir, fs.constants.W_OK);
  console.log('Uploads directory is ready:', uploadsDir);
} catch (error) {
  console.error('Error setting up uploads directory:', error);
  process.exit(1);
}

// Serve static files with proper headers
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Ashish:@Ashish5151@socialmeadia.73eeui8.mongodb.net/?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'instaclone' // Explicitly specify the database name
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    details: err
  });
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 