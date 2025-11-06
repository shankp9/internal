const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded transcripts as static files
app.use('/uploads/transcripts', express.static(path.join(__dirname, 'uploads/transcripts')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Resource Management System API' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/developers', require('./routes/developers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/search', require('./routes/search'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api', require('./routes/prd'));
app.use('/api', require('./routes/assignmentSuggestions'));
app.use('/api', require('./routes/developerTasks'));
app.use('/api/ai-consumption', require('./routes/aiConsumption'));

// 404 handler - must be after all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware - must be last
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/resource_management')
.then(() => {
  console.log('✅ MongoDB connected successfully');
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return next(new Error('Authentication error: User not found or inactive'));
    }
    
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Meeting pipeline namespace
const pipelineNamespace = io.of('/pipeline');

// Apply authentication to pipeline namespace
pipelineNamespace.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return next(new Error('Authentication error: User not found or inactive'));
    }
    
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
});

pipelineNamespace.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.user.name} (${socket.user._id})`);
  
  // Join meeting pipeline room
  socket.on('join-meeting-pipeline', (meetingId) => {
    const room = `meeting-${meetingId}`;
    socket.join(room);
    console.log(`[Socket.IO] Client joined room: ${room}`);
  });
  
  // Leave meeting pipeline room
  socket.on('leave-meeting-pipeline', (meetingId) => {
    const room = `meeting-${meetingId}`;
    socket.leave(room);
    console.log(`[Socket.IO] Client left room: ${room}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.user.name}`);
  });
});

// Export io instance for use in routes
app.set('io', io);
app.set('pipelineNamespace', pipelineNamespace);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Socket.IO server initialized`);
});
