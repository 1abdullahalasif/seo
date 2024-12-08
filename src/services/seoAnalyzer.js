const puppeteer = require('puppeteer');
const axios = require('axios');

class SEOAnalyzer {
    constructor() {
        this.browser = null;
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    async analyzePage(url) {
        if (!this.browser) {
            await this.initialize();
        }

        const page = await this.browser.newPage();
        await page.goto(url, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });

        const results = {
            meta: await this.analyzeMeta(page),
            headings: await this.analyzeHeadings(page),
            images: await this.analyzeImages(page),
            performance: await this.analyzePerformance(page),
            seo: await this.analyzeSEOElements(page)
        };

        await page.close();
        return results;
    }

    async analyzeMeta(page) {
        return await page.evaluate(() => {
            const meta = {};
            
            // Title analysis
            const title = document.querySelector('title');
            meta.title = {
                content: title ? title.innerText : null,
                length: title ? title.innerText.length : 0,
                status: title ? 
                    (title.innerText.length < 60 ? 'good' : 'too_long') 
                    : 'missing'
            };

            // Meta description analysis
            const description = document.querySelector('meta[name="description"]');
            meta.description = {
                content: description ? description.getAttribute('content') : null,
                length: description ? description.getAttribute('content').length : 0,
                status: description ? 
                    (description.getAttribute('content').length < 160 ? 'good' : 'too_long') 
                    : 'missing'
            };

            // Keywords analysis
            const keywords = document.querySelector('meta[name="keywords"]');
            meta.keywords = keywords ? 
                keywords.getAttribute('content').split(',').map(k => k.trim()) 
                : [];

            return meta;
        });
    }

    async analyzeHeadings(page) {
        return await page.evaluate(() => {
            const headings = {};
            ['h1', 'h2', 'h3'].forEach(tag => {
                const elements = document.getElementsByTagName(tag);
                headings[tag] = Array.from(elements).map(el => ({
                    content: el.innerText,
                    count: 1
                }));
            });
            return headings;
        });
    }

    async analyzeImages(page) {
        return await page.evaluate(() => {
            const images = Array.from(document.getElementsByTagName('img'));
            return images.map(img => ({
                src: img.src,
                alt: img.alt,
                hasAlt: !!img.alt,
                dimensions: {
                    width: img.naturalWidth || img.width,
                    height: img.naturalHeight || img.height
                }
            }));
        });
    }

    async analyzePerformance(page) {
        const metrics = await page.metrics();
        const performance = {
            pageSize: await this.calculatePageSize(page),
            loadTime: metrics.TaskDuration,
            mobileScore: Math.floor(Math.random() * 30) + 70, // Placeholder for actual mobile testing
            desktopScore: Math.floor(Math.random() * 20) + 80 // Placeholder for actual desktop testing
        };
        return performance;
    }

    async analyzeSEOElements(page) {
        const seoIssues = [];
        const results = await page.evaluate(() => {
            const issues = [];

            // Check title
            const title = document.querySelector('title');
            if (!title) {
                issues.push({
                    type: 'meta_title',
                    severity: 'critical',
                    description: 'Missing meta title tag'
                });
            }

            // Check meta description
            const description = document.querySelector('meta[name="description"]');
            if (!description) {
                issues.push({
                    type: 'meta_description',
                    severity: 'critical',
                    description: 'Missing meta description tag'
                });
            }

            // Check h1
            const h1s = document.getElementsByTagName('h1');
            if (h1s.length === 0) {
                issues.push({
                    type: 'headings',
                    severity: 'critical',
                    description: 'Missing H1 heading'
                });
            } else if (h1s.length > 1) {
                issues.push({
                    type: 'headings',
                    severity: 'warning',
                    description: 'Multiple H1 headings found'
                });
            }

            return issues;
        });

        return {
            score: this.calculateSEOScore(results),
            issues: results
        };
    }

    calculateSEOScore(issues) {
        let score = 100;
        issues.forEach(issue => {
            if (issue.severity === 'critical') score -= 10;
            if (issue.severity === 'warning') score -= 5;
        });
        return Math.max(0, score);
    }

    async calculatePageSize(page) {
        return await page.evaluate(() => {
            const resources = performance.getEntriesByType('resource');
            return resources.reduce((total, resource) => total + resource.transferSize, 0);
        });
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = new SEOAnalyzer();