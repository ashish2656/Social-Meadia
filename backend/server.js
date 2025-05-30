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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  // Check if directory is writable
  fs.accessSync(uploadsDir, fs.constants.W_OK);
  console.log('Uploads directory is ready:', uploadsDir);
} catch (error) {
  console.error('Error setting up uploads directory:', error);
  process.exit(1);
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [/\.vercel\.app$/, 'https://social-meadia.vercel.app']  // This will allow all Vercel domains and your specific domain
    : ['http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true
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

// Serve static files with error handling
app.use('/uploads', (req, res, next) => {
  const filePath = path.join(uploadsDir, req.path);
  // Prevent directory traversal
  if (!filePath.startsWith(uploadsDir)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  express.static(uploadsDir)(req, res, (err) => {
    if (err) {
      console.error('Static file error:', {
        path: req.path,
        error: err.message
      });
      if (err.code === 'ENOENT') {
        return res.status(404).json({ message: 'File not found' });
      }
      return res.status(500).json({ message: 'Error serving file' });
    }
    next();
  });
});

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