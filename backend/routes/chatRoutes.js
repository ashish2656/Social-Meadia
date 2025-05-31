const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/chat');
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get all chats for current user
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      'participants.user': req.user.id
    })
    .populate('participants.user', 'username profilePicture')
    .populate('lastMessage')
    .sort('-updatedAt');

    res.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new individual chat
router.post('/individual', auth, async (req, res) => {
  try {
    const { recipientId } = req.body;

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      type: 'individual',
      participants: {
        $all: [
          { $elemMatch: { user: req.user.id } },
          { $elemMatch: { user: recipientId } }
        ]
      }
    });

    if (existingChat) {
      return res.json(existingChat);
    }

    const newChat = new Chat({
      type: 'individual',
      participants: [
        { user: req.user.id, role: 'member' },
        { user: recipientId, role: 'member' }
      ]
    });

    await newChat.save();
    await newChat.populate('participants.user', 'username profilePicture');

    res.status(201).json(newChat);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new group chat
router.post('/group', auth, async (req, res) => {
  try {
    const { name, participantIds } = req.body;

    // Include the creator
    const allParticipants = [
      { user: req.user.id, role: 'admin' },
      ...participantIds.map(id => ({ user: id, role: 'member' }))
    ];

    const newChat = new Chat({
      type: 'group',
      name,
      participants: allParticipants
    });

    await newChat.save();
    await newChat.populate('participants.user', 'username profilePicture');

    res.status(201).json(newChat);
  } catch (error) {
    console.error('Error creating group chat:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message
router.post('/:chatId/messages', auth, upload.single('file'), async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, contentType = 'text' } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is participant
    if (!chat.participants.some(p => p.user.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const newMessage = {
      sender: req.user.id,
      content,
      contentType,
      fileUrl: req.file ? `/uploads/chat/${req.file.filename}` : undefined
    };

    chat.messages.push(newMessage);
    chat.lastMessage = newMessage;
    await chat.save();

    // Populate sender info for the new message
    await chat.populate('messages.sender', 'username profilePicture');

    res.status(201).json(chat.messages[chat.messages.length - 1]);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get chat messages
router.get('/:chatId/messages', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const chat = await Chat.findById(chatId)
      .populate('messages.sender', 'username profilePicture')
      .populate('messages.readBy.user', 'username')
      .slice('messages', [(page - 1) * limit, limit]);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is participant
    if (!chat.participants.some(p => p.user.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(chat.messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark messages as read
router.post('/:chatId/read', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { messageIds } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is participant
    if (!chat.participants.some(p => p.user.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Mark messages as read
    chat.messages.forEach(message => {
      if (messageIds.includes(message._id.toString()) && 
          !message.readBy.some(r => r.user.toString() === req.user.id)) {
        message.readBy.push({
          user: req.user.id,
          readAt: new Date()
        });
      }
    });

    await chat.save();
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Initiate call
router.post('/:chatId/call', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { type } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is participant
    if (!chat.participants.some(p => p.user.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const newCall = {
      type,
      initiator: req.user.id,
      participants: chat.participants.map(p => ({
        user: p.user,
        status: p.user.toString() === req.user.id ? 'accepted' : 'pending'
      }))
    };

    chat.callHistory.push(newCall);
    await chat.save();

    // In a real application, you would trigger WebRTC signaling here
    res.status(201).json(newCall);
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update call status
router.put('/:chatId/call/:callId', auth, async (req, res) => {
  try {
    const { chatId, callId } = req.params;
    const { status } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const call = chat.callHistory.id(callId);
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    const participant = call.participants.find(
      p => p.user.toString() === req.user.id
    );

    if (!participant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    participant.status = status;
    
    if (status === 'accepted') {
      participant.joinedAt = new Date();
    } else if (status === 'declined' || status === 'missed') {
      participant.leftAt = new Date();
    }

    // If all participants have responded, calculate call duration
    const allResponded = call.participants.every(p => 
      p.status === 'accepted' || p.status === 'declined' || p.status === 'missed'
    );

    if (allResponded) {
      call.endedAt = new Date();
      const joinedParticipants = call.participants.filter(p => p.joinedAt);
      if (joinedParticipants.length > 0) {
        const lastLeft = Math.max(...joinedParticipants.map(p => p.leftAt || new Date()));
        const firstJoined = Math.min(...joinedParticipants.map(p => p.joinedAt));
        call.duration = Math.round((lastLeft - firstJoined) / 1000); // Duration in seconds
      }
    }

    await chat.save();
    res.json(call);
  } catch (error) {
    console.error('Error updating call status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 