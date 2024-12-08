const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const winston = require('winston');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Create logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// **Trust Proxy Configuration** (Fixes Render's proxy-related issue)
app.set('trust proxy', true);

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        logger.info('Connected to MongoDB Atlas');
    })
    .catch((error) => {
        logger.error('MongoDB connection error:', error);
        process.exit(1);
    });

// Health check route
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Routes
app.use('/api', require('./src/routes/api'));

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'An unexpected error occurred',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});
