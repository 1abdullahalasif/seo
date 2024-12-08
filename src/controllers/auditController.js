const Audit = require('../models/Audit');
const seoAnalyzer = require('../services/seoAnalyzer');

exports.startAudit = async (req, res) => {
    try {
        const { websiteUrl, email, name, companyDomain } = req.body;

        const audit = new Audit({
            websiteUrl,
            email,
            name,
            companyDomain,
            status: 'pending'
        });

        await audit.save();

        processAudit(audit._id);

        res.status(201).json({
            success: true,
            message: 'Audit started successfully',
            auditId: audit._id
        });
    } catch (error) {
        console.error('Error starting audit:', error);
        res.status(500).json({ success: false, message: 'Error starting audit', error: error.message });
    }
};

exports.getAuditStatus = async (req, res) => {
    try {
        const audit = await Audit.findById(req.params.id);

        if (!audit) {
            return res.status(404).json({ success: false, message: 'Audit not found' });
        }

        const response = {
            success: true,
            audit: {
                status: audit.status,
                createdAt: audit.createdAt,
                completedAt: audit.completedAt
            }
        };

        if (audit.status === 'completed') {
            response.audit.results = audit.results;
            response.audit.summary = audit.summary;
        }

        if (audit.status === 'failed') {
            response.audit.error = audit.error;
        }

        res.json(response);
    } catch (error) {
        console.error('Error getting audit status:', error);
        res.status(500).json({ success: false, message: 'Error getting audit status', error: error.message });
    }
};

async function processAudit(auditId) {
    try {
        await Audit.findByIdAndUpdate(auditId, { status: 'processing' });

        const audit = await Audit.findById(auditId);

        const results = await seoAnalyzer.analyzePage(audit.websiteUrl);

        const recommendations = generateRecommendations(results);

        const score = calculateOverallScore(results);

        await Audit.findByIdAndUpdate(auditId, {
            status: 'completed',
            results,
            summary: {
                score,
                criticalIssues: recommendations.filter(r => r.severity === 'critical').length,
                warnings: recommendations.filter(r => r.severity === 'warning').length,
                passed: recommendations.filter(r => r.severity === 'info').length,
                recommendations
            },
            completedAt: new Date()
        });

    } catch (error) {
        console.error('Error processing audit:', error);
        await Audit.findByIdAndUpdate(auditId, { status: 'failed', error: error.message });
    } finally {
        await seoAnalyzer.cleanup();
    }
}

function generateRecommendations(results) {
    const recommendations = [];

    if (!results.meta?.title?.content) {
        recommendations.push({
            type: 'meta_title',
            severity: 'critical',
            description: 'Missing meta title tag',
            impact: 'Crucial for SEO and social sharing',
            howToFix: 'Add a descriptive title tag between 50-60 characters'
        });
    }

    return recommendations;
}

function calculateOverallScore(results) {
    let score = 100;

    if (!results.meta?.title?.content) score -= 10;

    return Math.max(0, Math.min(100, score));
}

module.exports = exports;
