const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');

// Store active users and their socket connections
const activeUsers = new Map();

const initializeSocket = (io) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.username} (${socket.userId})`);

    // Store user's socket connection
    activeUsers.set(socket.userId.toString(), socket.id);

    // Notify user of successful connection
    socket.emit('connected', {
      message: 'Connected to E2EE chat server',
      userId: socket.userId
    });

    // Join user's personal room for direct messages
    socket.join(`user:${socket.userId}`);

    // Handle sending encrypted messages
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, ciphertext, encryptedKey, iv, authTag, sequenceNumber } = data;

        // Validate required fields
        if (!receiverId || !ciphertext || !encryptedKey || !iv || !authTag) {
          return socket.emit('error', { message: 'Missing required message fields' });
        }

        // Check if receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
          return socket.emit('error', { message: 'Receiver not found' });
        }

        // Save message to database (only ciphertext)
        const message = new Message({
          senderId: socket.userId,
          receiverId,
          ciphertext,
          encryptedKey,
          iv,
          authTag,
          sequenceNumber: sequenceNumber || 0,
          timestamp: new Date()
        });

        await message.save();

        // Check if receiver is online
        const receiverSocketId = activeUsers.get(receiverId.toString());
        
        if (receiverSocketId) {
          // Send to online receiver
          io.to(`user:${receiverId}`).emit('receive_message', {
            messageId: message._id,
            senderId: socket.userId,
            senderUsername: socket.username,
            ciphertext,
            encryptedKey,
            iv,
            authTag,
            sequenceNumber: message.sequenceNumber,
            timestamp: message.timestamp
          });

          // Confirm delivery to sender
          socket.emit('message_sent', {
            messageId: message._id,
            delivered: true,
            timestamp: message.timestamp
          });
        } else {
          // Receiver is offline - message will be delivered when they come online
          socket.emit('message_sent', {
            messageId: message._id,
            delivered: false,
            timestamp: message.timestamp
          });
        }
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      if (receiverId) {
        socket.to(`user:${receiverId}`).emit('typing', {
          senderId: socket.userId,
          senderUsername: socket.username,
          isTyping
        });
      }
    });

    // Handle user going online/offline
    socket.on('user_online', () => {
      // Fetch undelivered messages
      Message.find({
        receiverId: socket.userId,
        delivered: false
      })
      .sort({ timestamp: 1 })
      .populate('senderId', 'username')
      .then(messages => {
        if (messages.length > 0) {
          socket.emit('pending_messages', messages.map(msg => ({
            messageId: msg._id,
            senderId: msg.senderId._id,
            senderUsername: msg.senderId.username,
            ciphertext: msg.ciphertext,
            encryptedKey: msg.encryptedKey,
            iv: msg.iv,
            authTag: msg.authTag,
            sequenceNumber: msg.sequenceNumber,
            timestamp: msg.timestamp
          })));

          // Mark messages as delivered
          Message.updateMany(
            { _id: { $in: messages.map(m => m._id) } },
            { delivered: true }
          ).exec();
        }
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.username} (${socket.userId})`);
      activeUsers.delete(socket.userId.toString());
      
      // Notify other users (optional)
      socket.broadcast.emit('user_offline', {
        userId: socket.userId,
        username: socket.username
      });
    });
  });
};

module.exports = { initializeSocket, activeUsers };

