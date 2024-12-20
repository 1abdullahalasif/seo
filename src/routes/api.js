const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const auditController = require('../controllers/auditController');
const validation = require('../utils/validation');
const logger = require('../utils/logger');

// Rate limiting configuration
const auditLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded:', { ip: req.ip });
        res.status(429).json({
            success: false,
            message: 'Too many requests, please try again later.'
        });
    }
});

// Base route to check if API is working
router.get('/', (req, res) => {
    res.json({ 
        success: true,
        message: 'SEO Audit API is running',
        endpoints: {
            createAudit: 'POST /audit',
            getStatus: 'GET /audit/:id',
            getTechnical: 'GET /audit/:id/technical',
            getOnPage: 'GET /audit/:id/onpage',
            getOffPage: 'GET /audit/:id/offpage',
            getAnalytics: 'GET /audit/:id/analytics',
            getRecommendations: 'GET /audit/:id/recommendations'
        }
    });
});

// Start new audit
router.post('/', auditLimiter, validation.validateAuditRequest, (req, res, next) => {
    logger.info('Received audit request:', { url: req.body.websiteUrl });
    auditController.startAudit(req, res).catch(next);
});

// Get audit status
router.get('/:id', validation.validateURLParams, (req, res, next) => {
    logger.info('Received status request:', { id: req.params.id });
    auditController.getAuditStatus(req, res).catch(next);
});

// Get technical SEO results
router.get('/:id/technical', validation.validateURLParams, (req, res, next) => {
    logger.info('Received technical SEO request:', { id: req.params.id });
    auditController.getTechnicalSEO(req, res).catch(next);
});

// Get on-page SEO results
router.get('/:id/onpage', validation.validateURLParams, (req, res, next) => {
    logger.info('Received on-page SEO request:', { id: req.params.id });
    auditController.getOnPageSEO(req, res).catch(next);
});

// Get off-page SEO results
router.get('/:id/offpage', validation.validateURLParams, (req, res, next) => {
    logger.info('Received off-page SEO request:', { id: req.params.id });
    auditController.getOffPageSEO(req, res).catch(next);
});

// Get analytics results
router.get('/:id/analytics', validation.validateURLParams, (req, res, next) => {
    logger.info('Received analytics request:', { id: req.params.id });
    auditController.getAnalytics(req, res).catch(next);
});

// Get recommendations
router.get('/:id/recommendations', validation.validateURLParams, (req, res, next) => {
    logger.info('Received recommendations request:', { id: req.params.id });
    auditController.getRecommendations(req, res).catch(next);
});

// Error handler
router.use((err, req, res, next) => {
    logger.error('API Error:', {
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'An unexpected error occurred',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

module.exports = router;