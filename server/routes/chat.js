const express = require('express');
const { verifyToken } = require('./auth');
const Message = require('../models/Message');
const router = express.Router();

// Get message history between two users
router.get('/history/:otherUserId', verifyToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const { limit = 50, before } = req.query;

    const query = {
      $or: [
        { senderId: req.userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: req.userId }
      ]
    };

    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('senderId', 'username')
      .populate('receiverId', 'username');

    res.json(messages.reverse()); // Return in chronological order
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark messages as read
router.put('/read/:otherUserId', verifyToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;

    await Message.updateMany(
      {
        senderId: otherUserId,
        receiverId: req.userId,
        read: false
      },
      { read: true }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

