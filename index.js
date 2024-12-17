const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
    origin: '*', // In production, replace with your frontend domain
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: true
}));

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
}));

app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.info('Connected to MongoDB Atlas');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    });

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ message: 'SEO Audit API Server', status: 'running' });
});

// Routes
app.use('/api', require('./src/routes/api'));

// Error handling
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'An unexpected error occurred',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.info(`Server running on port ${PORT}`);
});