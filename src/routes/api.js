const express = require('express');
const auditController = require('../controllers/auditController');

const router = express.Router();

router.post('/audit', auditController.startAudit);
router.get('/audit/:id', auditController.getAuditStatus);

module.exports = router;
