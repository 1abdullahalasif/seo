// src/utils/validation.js
const { body, param, validationResult } = require('express-validator');

// Validation middleware for audit request
exports.validateAuditRequest = [
    // Website URL validation
    body('websiteUrl')
        .trim()
        .notEmpty()
        .withMessage('Website URL is required')
        .isURL()
        .withMessage('Invalid URL format'),
    
    // Email validation
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format'),
    
    // Name validation
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2 })
        .withMessage('Name must be at least 2 characters long'),
    
    // Company domain validation
    body('companyDomain')
        .trim()
        .notEmpty()
        .withMessage('Company domain is required')
        .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/)
        .withMessage('Invalid domain format'),

    // Validation result middleware
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(error => ({
                    field: error.param,
                    message: error.msg
                }))
            });
        }
        next();
    }
];

// URL parameter validation for audit ID
exports.validateURLParams = [
    param('id')
        .isMongoId()
        .withMessage('Invalid audit ID format'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(error => ({
                    parameter: error.param,
                    message: error.msg
                }))
            });
        }
        next();
    }
];

// Helper function to validate URLs
exports.isValidURL = (url) => {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
};

// Helper function to validate email format
exports.isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Helper function to validate domain format
exports.isValidDomain = (domain) => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
};