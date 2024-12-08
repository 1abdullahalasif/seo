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
                length: Number,
                status: String
            },
            description: {
                content: String,
                length: Number,
                status: String
            }
        },
        headings: mongoose.Schema.Types.Mixed,
        images: [{
            src: String,
            alt: String,
            hasAlt: Boolean,
            dimensions: {
                width: Number,
                height: Number
            }
        }],
        performance: {
            loadTime: Number,
            domContentLoaded: Number,
            firstPaint: Number
        },
        seo: {
            score: Number,
            issues: [{
                type: String,
                severity: String,
                description: String
            }]
        }
    },
    summary: {
        score: Number,
        criticalIssues: Number,
        warnings: Number,
        passed: Number,
        recommendations: [recommendationSchema]  // Using the defined sub-schema
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    error: String
});

module.exports = mongoose.model('Audit', auditSchema);