const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController'); // Import the controller

// Route to start an audit
router.post('/audit/start', auditController.startAudit);

// Route to get audit status by ID
router.get('/audit/status/:id', auditController.getAuditStatus);

module.exports = router;
