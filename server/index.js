const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const keyRoutes = require('./routes/keys');
const chatRoutes = require('./routes/chat');
const { initializeSocket } = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// MongoDB connection
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.warn('WARNING: MONGODB_URI environment variable is not defined! Defaulting to local MongoDB.');
} else {
  console.log('MONGODB_URI is provided. Attempting to connect...');
}

const connectionOptions = {
  // Add any specific options here if needed, but remove deprecated ones
};

mongoose.connect(mongoUri || 'mongodb://localhost:27017/studybuddy_e2ee', connectionOptions)
  .then(() => {
    console.log('--- MongoDB Connection Successful ---');
    console.log(`Connected to database: ${mongoose.connection.name}`);
    console.log(`Host: ${mongoose.connection.host}`);
  })
  .catch(err => {
    console.error('--- MongoDB Connection Error ---');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    if (err.reason) console.error('Error reason:', err.reason);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'E2EE Chat Server is running' });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Study Buddy E2EE Chat Server is running',
    version: '1.0.0'
  });
});

// API Info route (prevents "Cannot GET /api")
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'E2EE Chat API is live. Use /api/auth, /api/keys, or /api/chat endpoints.'
  });
});

// Initialize Socket.IO
initializeSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io };

