const mongoose = require('mongoose');

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
            },
            keywords: [String]
        },
        headings: {
            h1: [{
                content: String,
                count: Number
            }],
            h2: [{
                content: String,
                count: Number
            }],
            h3: [{
                content: String,
                count: Number
            }]
        },
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
            pageSize: Number,
            loadTime: Number,
            mobileScore: Number,
            desktopScore: Number
        },
        seo: {
            score: Number,
            issues: [{
                type: String,
                severity: String,
                description: String,
                location: String
            }]
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date
});

module.exports = mongoose.model('Audit', auditSchema);