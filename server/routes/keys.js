const express = require('express');
const crypto = require('crypto');
const { verifyToken } = require('./auth');
const User = require('../models/User');
const router = express.Router();

// Upload public key
router.post('/upload', verifyToken, async (req, res) => {
  try {
    const { publicKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({ error: 'Public key is required' });
    }

    // Validate public key format (basic check)
    if (typeof publicKey !== 'string' || publicKey.length < 100) {
      return res.status(400).json({ error: 'Invalid public key format' });
    }

    // Generate fingerprint for verification
    const fingerprint = crypto
      .createHash('sha256')
      .update(publicKey)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase()
      .match(/.{1,4}/g)
      .join('-');

    // Update user with public key
    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        publicKey,
        publicKeyFingerprint: fingerprint,
        keyGeneratedAt: new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Public key uploaded successfully',
      fingerprint
    });
  } catch (error) {
    console.error('Key upload error:', error);
    res.status(500).json({ error: 'Server error during key upload' });
  }
});

// Get public key for a user
router.get('/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('username publicKey publicKeyFingerprint keyGeneratedAt');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.publicKey) {
      return res.status(404).json({ error: 'User has not generated a key pair yet' });
    }

    res.json({
      userId: user._id,
      username: user.username,
      publicKey: user.publicKey,
      fingerprint: user.publicKeyFingerprint,
      keyGeneratedAt: user.keyGeneratedAt
    });
  } catch (error) {
    console.error('Get key error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users with public keys (for contact list)
router.get('/', verifyToken, async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.userId },
      publicKey: { $ne: null }
    }).select('username publicKeyFingerprint keyGeneratedAt');

    res.json(users.map(user => ({
      id: user._id,
      username: user.username,
      fingerprint: user.publicKeyFingerprint,
      keyGeneratedAt: user.keyGeneratedAt
    })));
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

