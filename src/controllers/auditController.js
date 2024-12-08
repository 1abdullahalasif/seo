const Audit = require('../models/Audit');
const seoAnalyzer = require('../services/seoAnalyzer');

exports.startAudit = async (req, res) => {
    try {
        const { websiteUrl, email, name, companyDomain } = req.body;

        // Create new audit record
        const audit = new Audit({
            websiteUrl,
            email,
            name,
            companyDomain,
            status: 'pending'
        });

        await audit.save();

        // Start the audit process asynchronously
        processAudit(audit._id);

        res.status(201).json({
            success: true,
            message: 'Audit started successfully',
            auditId: audit._id
        });
    } catch (error) {
        console.error('Error starting audit:', error);
        res.status(500).json({
            success: false,
            message: 'Error starting audit',
            error: error.message
        });
    }
};

exports.getAuditStatus = async (req, res) => {
    try {
        const audit = await Audit.findById(req.params.id);
        
        if (!audit) {
            return res.status(404).json({
                success: false,
                message: 'Audit not found'
            });
        }

        res.json({
            success: true,
            audit: {
                status: audit.status,
                results: audit.status === 'completed' ? audit.results : null,
                createdAt: audit.createdAt,
                completedAt: audit.completedAt
            }
        });
    } catch (error) {
        console.error('Error getting audit status:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting audit status',
            error: error.message
        });
    }
};

exports.getAuditResults = async (req, res) => {
    try {
        const audit = await Audit.findById(req.params.id);
        
        if (!audit) {
            return res.status(404).json({
                success: false,
                message: 'Audit not found'
            });
        }

        if (audit.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Audit is not completed yet',
                status: audit.status
            });
        }

        res.json({
            success: true,
            results: audit.results
        });
    } catch (error) {
        console.error('Error getting audit results:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting audit results',
            error: error.message
        });
    }
};

async function processAudit(auditId) {
    try {
        // Update status to processing
        await Audit.findByIdAndUpdate(auditId, { status: 'processing' });

        // Get audit details
        const audit = await Audit.findById(auditId);
        
        // Perform SEO analysis
        const results = await seoAnalyzer.analyzePage(audit.websiteUrl);

        // Update audit with results
        await Audit.findByIdAndUpdate(auditId, {
            status: 'completed',
            results: results,
            completedAt: new Date()
        });

    } catch (error) {
        console.error('Error processing audit:', error);
        await Audit.findByIdAndUpdate(auditId, {
            status: 'failed',
            error: error.message
        });
    } finally {
        await seoAnalyzer.cleanup();
    }
}

module.exports = exports;