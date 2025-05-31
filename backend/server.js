const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

// Store active connections
const clients = new Map();

// WebSocket connection handler
wss.on('connection', async (ws, req) => {
  try {
    // Get token from query string
    const token = req.url.split('?token=')[1];
    if (!token) {
      ws.close();
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // Store connection
    clients.set(userId, ws);

    // Update user's online status
    await User.findByIdAndUpdate(userId, { 
      onlineStatus: 'online',
      lastSeen: new Date()
    });

    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        
        switch (message.type) {
          case 'ice_candidate':
            // Forward ICE candidate to peer
            const peerWs = clients.get(message.peerId);
            if (peerWs) {
              peerWs.send(JSON.stringify({
                type: 'ice_candidate',
                candidate: message.candidate,
                chatId: message.chatId,
                peerId: userId
              }));
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    // Handle disconnection
    ws.on('close', async () => {
      clients.delete(userId);
      await User.findByIdAndUpdate(userId, { 
        onlineStatus: 'offline',
        lastSeen: new Date()
      });
    });
  } catch (error) {
    console.error('WebSocket connection error:', error);
    ws.close();
  }
});

// Broadcast to chat participants
function broadcastToChat(chatId, message, excludeUserId = null) {
  Chat.findById(chatId)
    .then(chat => {
      if (!chat) return;

      chat.participants.forEach(participant => {
        if (participant.user.toString() === excludeUserId) return;
        
        const ws = clients.get(participant.user.toString());
        if (ws) {
          ws.send(JSON.stringify(message));
        }
      });
    })
    .catch(error => {
      console.error('Broadcast error:', error);
    });
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://social-meadia.vercel.app',
        'https://social-media-frontend-fnjj.vercel.app',
        'https://social-meadia-zg52-fyoplnw1j-ashishs-projects-9530e095.vercel.app',
        /\.vercel\.app$/  // Allow all Vercel preview domains
      ]
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Access-Control-Allow-Origin']
}));

// Handle preflight requests
app.options('*', cors());

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
const chatUploadsDir = path.join(uploadsDir, 'chat');

try {
  [uploadsDir, chatUploadsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
    // Check if directory is writable
    fs.accessSync(dir, fs.constants.W_OK);
  });
  console.log('Upload directories are ready');
} catch (error) {
  console.error('Error setting up upload directories:', error);
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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Ashish:Ashish5151@socialmeadia.73eeui8.mongodb.net/instaclone?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/chats', require('./routes/chatRoutes'));

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
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 