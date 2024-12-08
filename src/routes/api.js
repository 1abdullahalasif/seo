const express = require('express');
const rateLimit = require('express-rate-limit');
const auditController = require('../controllers/auditController');

const router = express.Router();

// **Rate limiter middleware**
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  keyGenerator: (req) => req.ip, // Use req.ip to avoid trust proxy issues
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.',
    });
  },
});

// Apply rate limiter to all routes
router.use(limiter);

// Define routes
router.post('/audit', auditController.createAudit);

module.exports = router;
