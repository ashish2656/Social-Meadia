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
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Create post
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    const { caption } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const post = await Post.create({
      user: req.user.id,
      image: req.file.filename,
      caption
    });

    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get feed posts
router.get('/feed', protect, async (req, res) => {
  try {
    let query = {};
    
    // If user has followers, only show posts from followed users and own posts
    if (req.user.following && req.user.following.length > 0) {
      query = {
        user: { $in: [...req.user.following, req.user.id] }
      };
    }

    const posts = await Post.find(query)
      .populate('user', 'username profilePicture')
      .populate('comments.user', 'username profilePicture')
      .sort('-createdAt');

    res.json(posts);
  } catch (error) {
    res.status(400).json({ message: error.message });
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