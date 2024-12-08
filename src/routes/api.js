const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');

// Middleware to validate request body
const validateAuditRequest = (req, res, next) => {
    const { websiteUrl, email, name, companyDomain } = req.body;

    if (!websiteUrl || !email || !name || !companyDomain) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields'
        });
    }

    // Basic URL validation
    try {
        new URL(websiteUrl);
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid website URL'
        });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid email format'
        });
    }

    next();
};

// Routes
router.post('/audit', validateAuditRequest, auditController.startAudit);
router.get('/audit/:id', auditController.getAuditStatus);
router.get('/audit/:id/results', auditController.getAuditResults);

module.exports = router;