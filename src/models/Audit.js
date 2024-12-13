const mongoose = require('mongoose');

// Define sub-schemas for recommendations
const recommendationSchema = new mongoose.Schema({
    type: String,
    severity: {
        type: String,
        enum: ['critical', 'warning', 'info']
    },
    description: String,
    impact: String,
    howToFix: String
});

const auditSchema = new mongoose.Schema({
    websiteUrl: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    companyDomain: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    results: {
        meta: {
            title: {
                content: String,
                length: Number
            },
            description: {
                content: String,
                length: Number
            },
            keywords: [String],
            favicon: String,
            canonical: String
        },
        headings: {
            h1: [{
                content: String,
                length: Number
            }],
            h2: [{
                content: String,
                length: Number
            }],
            h3: [{
                content: String,
                length: Number
            }],
            h4: [{
                content: String,
                length: Number
            }],
            h5: [{
                content: String,
                length: Number
            }],
            h6: [{
                content: String,
                length: Number
            }]
        },
        images: [{
            src: String,
            alt: String,
            hasAlt: Boolean
        }],
        links: {
            total: Number,
            internal: Number,
            external: Number,
            broken: [{
                href: String,
                text: String
            }]
        },
        performance: {
            pageSize: Number,
            loadTime: Number
        },
        technical: {
            ssl: Boolean,
            redirects: Number,
            responseTime: Number
        },
        robotsTxt: {
            exists: Boolean,
            content: String,
            hasSitemap: Boolean,
            error: String
        },
        sitemap: {
            exists: Boolean,
            urlCount: Number,
            error: String
        }
    },
    summary: {
        score: Number,
        criticalIssues: Number,
        warnings: Number,
        passed: Number,
        recommendations: [recommendationSchema]
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    error: String
});

module.exports = mongoose.model('Audit', auditSchema);