const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const auditController = require('../controllers/auditController');
const validation = require('../utils/validation');

// Rate limiting for audit endpoint
const auditLimiter = rateLimit({
    windowMs: process.env.API_RATE_WINDOW || 900000, // 15 minutes
    max: process.env.API_RATE_LIMIT || 100, // Limit each IP
    standardHeaders: true,
    legacyHeaders: false
});

// Debug route to check if API is working
router.get('/test', (req, res) => {
    res.json({ message: 'API is working' });
});

// Audit routes
router.post('/audit', auditLimiter, validation.validateAuditRequest, (req, res, next) => {
    auditController.startAudit(req, res).catch(next);
});
router.get('/audit/:id', validation.validateURLParams, (req, res, next) => {
    auditController.getAuditStatus(req, res).catch(next);
});

// Error handler
router.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(500).json({
        success: false,
        message: 'An error occurred',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

module.exports = router;