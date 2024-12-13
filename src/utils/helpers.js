// src/utils/helpers.js

// Helper function to validate URLs
exports.isValidURL = (url) => {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
};

// Helper function to validate email format
exports.isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Helper function to validate domain format
exports.isValidDomain = (domain) => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
};