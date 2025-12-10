const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Only ciphertext is stored - never plaintext
  ciphertext: {
    type: String,
    required: true
  },
  encryptedKey: {
    type: String,
    required: true
  },
  iv: {
    type: String,
    required: true
  },
  authTag: {
    type: String,
    required: true
  },
  sequenceNumber: {
    type: Number,
    required: true,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  delivered: {
    type: Boolean,
    default: false
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient querying
messageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);

