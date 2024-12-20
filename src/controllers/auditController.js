const Audit = require('../models/Audit');
const seoAnalyzer = require('../services/seoAnalyzer');
const logger = require('../utils/logger');

exports.startAudit = async (req, res) => {
    try {
        const { websiteUrl, email, name } = req.body;

        logger.info('Received audit request:', { websiteUrl, email, name });

        // Validate input data
        if (!websiteUrl || !email || !name) {
            logger.warn('Missing required fields:', { websiteUrl, email, name });
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Create new audit record
        const audit = new Audit({
            websiteUrl,
            email,
            name,
            status: 'pending'
        });

        await audit.save();
        logger.info('Audit record created:', { id: audit._id });

        // Start the audit process asynchronously
        processAudit(audit._id).catch(error => {
            logger.error('Error processing audit:', { id: audit._id, error });
        });

        res.status(201).json({
            success: true,
            message: 'Audit started successfully',
            auditId: audit._id
        });
    } catch (error) {
        logger.error('Error starting audit:', error);
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
            logger.warn('Audit not found:', { id: req.params.id });
            return res.status(404).json({
                success: false,
                message: 'Audit not found'
            });
        }

        logger.info('Retrieved audit status:', { id: req.params.id, status: audit.status });

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
        logger.error('Error getting audit status:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting audit status',
            error: error.message
        });
    }
};

// Private helper functions
async function processAudit(auditId) {
    try {
        // Update status to processing
        await Audit.findByIdAndUpdate(auditId, { status: 'processing' });
        logger.info('Started processing audit:', { id: auditId });

        // Get audit details
        const audit = await Audit.findById(auditId);
        
        // Perform SEO analysis
        let results;
        try {
            results = await seoAnalyzer.analyzePage(audit.websiteUrl);
            logger.info('SEO analysis completed:', { id: auditId });
        } catch (error) {
            logger.error('Error analyzing page:', { id: auditId, error });
            await Audit.findByIdAndUpdate(auditId, {
                status: 'failed',
                error: error.message
            });
            return;
        }

        // Generate recommendations based on results
        const recommendations = generateRecommendations(results);
        logger.info('Generated recommendations:', { id: auditId, count: recommendations.length });

        // Calculate overall score
        const score = calculateOverallScore(results);
        logger.info('Calculated overall score:', { id: auditId, score });

        // Update audit with results
        await Audit.findByIdAndUpdate(auditId, {
            status: 'completed',
            results: results,
            summary: {
                score,
                criticalIssues: recommendations.filter(r => r.severity === 'critical').length,
                warnings: recommendations.filter(r => r.severity === 'warning').length,
                passed: recommendations.filter(r => r.severity === 'info').length,
                recommendations
            },
            completedAt: new Date()
        });

        logger.info('Audit completed successfully:', { id: auditId });
    } catch (error) {
        logger.error('Error processing audit:', { id: auditId, error });
        await Audit.findByIdAndUpdate(auditId, {
            status: 'failed',
            error: error.message
        });
    }
}

function generateRecommendations(results) {
    const recommendations = [];

    // Meta recommendations
    if (!results.meta.title.content) {
        recommendations.push({
            type: 'meta_title',
            severity: 'critical',
            description: 'Missing meta title tag',
            impact: 'Crucial for SEO and social sharing',
            howToFix: 'Add a descriptive title tag between 50-60 characters'
        });
    }

    if (!results.meta.description.content) {
        recommendations.push({
            type: 'meta_description',
            severity: 'critical',
            description: 'Missing meta description tag',
            impact: 'Important for search result snippets',
            howToFix: 'Add a compelling meta description between 120-160 characters'
        });
    }

    // Image recommendations
    const imagesWithoutAlt = results.images?.filter(img => !img.hasAlt) || [];
    if (imagesWithoutAlt.length > 0) {
        recommendations.push({
            type: 'images',
            severity: 'warning',
            description: `${imagesWithoutAlt.length} images missing alt text`,
            impact: 'Affects accessibility and image SEO',
            howToFix: 'Add descriptive alt text to all images'
        });
    }

    // Add more recommendations based on your SEO criteria

    return recommendations;
}

function calculateOverallScore(results) {
    let score = 100;

    // Meta tags scoring
    if (!results.meta.title.content) score -= 10;
    if (!results.meta.description.content) score -= 10;
    if (results.meta.title.length > 60) score -= 5;
    if (results.meta.description.length > 160) score -= 5;

    // Images scoring
    const imagesWithoutAlt = results.images?.filter(img => !img.hasAlt) || [];
    score -= Math.min(20, imagesWithoutAlt.length * 2);

    // Add more scoring criteria based on your SEO requirements

    // Return score bounded between 0 and 100
    return Math.max(0, Math.min(100, score));
}

// Export additional controllers
exports.getTechnicalSEO = async (req, res) => {
    try {
        const audit = await Audit.findById(req.params.id);
        if (!audit || !audit.results) {
            return res.status(404).json({ success: false, message: 'Technical SEO data not found' });
        }
        res.json({ success: true, data: audit.results.technical });
    } catch (error) {
        logger.error('Error getting technical SEO:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getOnPageSEO = async (req, res) => {
    try {
        const audit = await Audit.findById(req.params.id);
        if (!audit || !audit.results) {
            return res.status(404).json({ success: false, message: 'On-page SEO data not found' });
        }
        res.json({ success: true, data: audit.results.onPage });
    } catch (error) {
        logger.error('Error getting on-page SEO:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getOffPageSEO = async (req, res) => {
    try {
        const audit = await Audit.findById(req.params.id);
        if (!audit || !audit.results) {
            return res.status(404).json({ success: false, message: 'Off-page SEO data not found' });
        }
        res.json({ success: true, data: audit.results.offPage });
    } catch (error) {
        logger.error('Error getting off-page SEO:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const audit = await Audit.findById(req.params.id);
        if (!audit || !audit.results) {
            return res.status(404).json({ success: false, message: 'Analytics data not found' });
        }
        res.json({ success: true, data: audit.results.analytics });
    } catch (error) {
        logger.error('Error getting analytics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getRecommendations = async (req, res) => {
  try {
    const audit = await Audit.findById(req.params.id);
    if (!audit || !audit.summary) {
        return res.status(404).json({ success: false, message: 'Recommendations not found' });
    }
    res.json({ 
        success: true, 
        recommendations: audit.summary.recommendations 
    });
} catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({ 
        success: false, 
        message: error.message 
    });
}
};