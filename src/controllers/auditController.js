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
        res.status(500).json({
            success: false,
            message: 'Error getting audit status',
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

        // Generate recommendations based on results
        const recommendations = generateRecommendations(results);

        // Calculate overall score
        const score = calculateOverallScore(results);

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

function generateRecommendations(results) {
    const recommendations = [];

    // Meta recommendations
    if (!results.meta?.title?.content) {
        recommendations.push({
            type: 'meta_title',
            severity: 'critical',
            description: 'Missing meta title tag',
            impact: 'Crucial for SEO and social sharing',
            howToFix: 'Add a descriptive title tag between 50-60 characters'
        });
    }

    if (!results.meta?.description?.content) {
        recommendations.push({
            type: 'meta_description',
            severity: 'critical',
            description: 'Missing meta description tag',
            impact: 'Important for search result snippets',
            howToFix: 'Add a compelling meta description between 120-160 characters'
        });
    }

    // Heading recommendations
    if (!results.headings?.h1 || results.headings.h1.length === 0) {
        recommendations.push({
            type: 'headings',
            severity: 'critical',
            description: 'Missing H1 heading',
            impact: 'Important for page structure and SEO',
            howToFix: 'Add a single, descriptive H1 heading to your page'
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

    // Performance recommendations
    if (results.performance?.loadTime > 3000) {
        recommendations.push({
            type: 'performance',
            severity: 'warning',
            description: 'Page load time is too high',
            impact: 'Affects user experience and SEO',
            howToFix: 'Optimize images, minimize JavaScript, and leverage caching'
        });
    }

    return recommendations;
}

function calculateOverallScore(results) {
    let score = 100;

    // Meta tags scoring
    if (!results.meta?.title?.content) score -= 10;
    if (!results.meta?.description?.content) score -= 10;
    if (results.meta?.title?.length > 60) score -= 5;
    if (results.meta?.description?.length > 160) score -= 5;

    // Headings scoring
    if (!results.headings?.h1 || results.headings.h1.length === 0) score -= 10;
    if (results.headings?.h1?.length > 1) score -= 5;

    // Images scoring
    const imagesWithoutAlt = results.images?.filter(img => !img.hasAlt) || [];
    score -= Math.min(20, imagesWithoutAlt.length * 2);

    // Performance scoring
    if (results.performance?.loadTime > 3000) score -= 10;

    // Return score bounded between 0 and 100
    return Math.max(0, Math.min(100, score));
}

module.exports = exports;