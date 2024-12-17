// src/utils/validation.js
const { body, param, validationResult } = require('express-validator');
const { isValidURL, isValidEmail, isValidDomain } = require('./helpers');

// Validation middleware for audit request
exports.validateAuditRequest = [
    // Website URL validation
    body('websiteUrl')
        .trim()
        .notEmpty()
        .withMessage('Website URL is required')
        .custom(isValidURL)
        .withMessage('Invalid URL format'),
    
    // Email validation
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .custom(isValidEmail)
        .withMessage('Invalid email format'),
    
    // Name validation
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2 })
        .withMessage('Name must be at least 2 characters long'),
    

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