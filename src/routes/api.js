// src/routes/api.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const auditController = require('../controllers/auditController');
const { validateAuditRequest, validateURLParams } = require('../utils/validation');

// Rate limiting
const auditLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10 // limit each IP to 10 requests per hour
});

// Health check route
router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Audit routes
router.post('/audit', 
    auditLimiter,
    validateAuditRequest,
    auditController.startAudit
);

router.get('/audit/:id',
    validateURLParams,
    auditController.getAuditStatus
);

// Error handling middleware
router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = router;