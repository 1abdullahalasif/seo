const mongoose = require('mongoose');

// Define sub-schemas for recommendations
const recommendationSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        trim: true
    },
    severity: {
        type: String,
        enum: ['critical', 'warning', 'info'],
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    impact: {
        type: String,
        trim: true
    },
    howToFix: {
        type: String,
        trim: true
    }
}, { _id: false });

// Main audit schema
const auditSchema = new mongoose.Schema({
    websiteUrl: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(v);
            },
            message: props => `${props.value} is not a valid URL!`
        }
    },
    email: {
        type: String,
        required: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Invalid email address']
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
                content: { type: String, trim: true },
                length: Number,
                status: { type: String, enum: ['pass', 'fail', 'warning'] }
            },
            description: {
                content: { type: String, trim: true },
                length: Number,
                status: { type: String, enum: ['pass', 'fail', 'warning'] }
            }
        },
        headings: mongoose.Schema.Types.Mixed,
        images: [{
            src: { type: String, trim: true },
            alt: { type: String, trim: true },
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
            score: { type: Number, min: 0, max: 100 },
            issues: [{
                type: { type: String, trim: true },
                severity: { type: String, enum: ['critical', 'warning', 'info'] },
                description: { type: String, trim: true }
            }]
        }
    },
    summary: {
        score: { type: Number, min: 0, max: 100 },
        criticalIssues: { type: Number, default: 0 },
        warnings: { type: Number, default: 0 },
        passed: { type: Number, default: 0 },
        recommendations: [recommendationSchema]  // Using the defined sub-schema
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    error: {
        type: String,
        trim: true
    },
    errorDetails: {
        code: { type: String, trim: true },
        message: { type: String, trim: true },
        stack: { type: String, trim: true }
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true // Automatically adds `createdAt` and `updatedAt` fields
});

// Indexing for better performance
auditSchema.index({ status: 1 });
auditSchema.index({ email: 1 });
auditSchema.index({ websiteUrl: 1 });

module.exports = mongoose.model('Audit', auditSchema);
