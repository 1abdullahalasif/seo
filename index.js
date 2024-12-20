const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const logger = require('./src/utils/logger');

// Load environment variables
dotenv.config();

const app = express();

// Enhanced CORS configuration
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'Origin', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Trust proxy settings for Render deployment
app.set('trust proxy', true);
app.enable('trust proxy');

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Modified Helmet configuration for iframe support
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "https://seo-audit-backend.onrender.com", "*"],
            frameSrc: ["'self'", "*"],
            frameAncestors: ["'self'", "*"]
        }
    }
}));

app.use(express.json());

// Enhanced MongoDB connection with retry logic
const connectDB = async (retries = 5) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        logger.info('Connected to MongoDB Atlas');
    } catch (error) {
        if (retries > 0) {
            logger.warn(`MongoDB connection failed. Retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return connectDB(retries - 1);
        }
        logger.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Initialize database connection
connectDB();

// Mount API routes
app.use('/audit', require('./src/routes/api'));

// Health check endpoint
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1;
    
    if (!dbStatus) {
        return res.status(503).json({
            status: 'error',
            message: 'Database connection is not ready',
            timestamp: new Date().toISOString()
        });
    }

    res.json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
        server: 'SEO Audit Backend',
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'SEO Audit API Server',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            audit: '/audit'
        }
    });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: Object.values(err.errors).map(e => e.message)
        });
    }

    if (err.name === 'MongoError' && err.code === 11000) {
        return res.status(409).json({
            success: false,
            message: 'Duplicate record found'
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
});

// Start server with enhanced error handling
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
    logger.error('Server error:', error);
    process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        logger.info('Server closed');
        mongoose.connection.close(false, () => {
            logger.info('MongoDB connection closed');
            process.exit(0);
        });
    });
});

// Handle uncaught exceptions and rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', {
        reason: reason,
        promise: promise
    });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Give the server a grace period to finish existing requests
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

module.exports = app;