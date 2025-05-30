const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function(req, file, cb) {
    // Check file type
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files (jpg, jpeg, png, gif) are allowed!'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).single('image');

// Create post
router.post('/', protect, (req, res) => {
  upload(req, res, async function(err) {
    try {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            message: 'File too large',
            details: 'Maximum file size is 5MB'
          });
        }
        return res.status(400).json({ 
          message: 'File upload error',
          details: err.message
        });
      } else if (err) {
        // An unknown error occurred
        return res.status(400).json({ 
          message: 'File upload error',
          details: err.message
        });
      }

      // Check if file was provided
      if (!req.file) {
        return res.status(400).json({ 
          message: 'Please upload an image',
          details: 'No file was uploaded'
        });
      }

      const { caption } = req.body;

      const post = await Post.create({
        user: req.user.id,
        image: req.file.filename,
        caption: caption || ''
      });

      res.status(201).json(post);
    } catch (error) {
      console.error('Post creation error:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?._id
      });
      res.status(500).json({ 
        message: 'Error creating post',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
});

// Get feed posts
router.get('/feed', protect, async (req, res) => {
  try {
    // Ensure user object exists
    if (!req.user) {
      return res.status(401).json({ 
        message: 'User not authenticated',
        details: 'User object not found in request'
      });
    }

    let query = {};
    
    // If user has followers, only show posts from followed users and own posts
    if (req.user.following && req.user.following.length > 0) {
      query = {
        user: { $in: [...req.user.following, req.user._id] }
      };
    }

    const posts = await Post.find(query)
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture')
      .sort('-createdAt')
      .lean(); // Use lean() for better performance

    if (!posts) {
      return res.status(404).json({ 
        message: 'No posts found',
        details: 'The feed is empty'
      });
    }

    // Transform posts to ensure all required fields exist
    const transformedPosts = posts.map(post => ({
      ...post,
      user: post.user || { username: 'Unknown', profilePicture: null },
      likes: post.likes || [],
      comments: (post.comments || []).map(comment => ({
        ...comment,
        user: comment.user || { username: 'Unknown', profilePicture: null }
      }))
    }));

    res.json(transformedPosts);
  } catch (error) {
    console.error('Feed error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id
    });
    
    res.status(500).json({ 
      message: 'Error fetching feed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user posts
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture')
      .sort('-createdAt');

    res.json(posts);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Like/Unlike post
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const isLiked = post.likes.includes(req.user.id);

    if (isLiked) {
      await post.updateOne({ $pull: { likes: req.user.id } });
      res.json({ message: 'Post unliked' });
    } else {
      await post.updateOne({ $push: { likes: req.user.id } });
      res.json({ message: 'Post liked' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add comment
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = {
      user: req.user.id,
      text
    };

    post.comments.push(comment);
    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('comments.user', 'username profilePicture');

    res.json(populatedPost.comments[populatedPost.comments.length - 1]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete comment
router.delete('/:postId/comment/:commentId', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.user.toString() !== req.user.id && post.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await post.updateOne({ $pull: { comments: { _id: req.params.commentId } } });
    res.json({ message: 'Comment removed' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 