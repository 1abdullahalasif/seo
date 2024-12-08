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
        
        try {
            await page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });

            const results = {
                meta: await this.analyzeMeta(page),
                headings: await this.analyzeHeadings(page),
                images: await this.analyzeImages(page),
                links: await this.analyzeLinks(page),
                performance: await this.analyzePerformance(page),
                seo: await this.analyzeSEOElements(page)
            };

            return results;
        } catch (error) {
            console.error('Error analyzing page:', error);
            throw error;
        } finally {
            await page.close();
        }
    }

    async analyzeMeta(page) {
        return await page.evaluate(() => {
            const meta = {};
            
            // Title analysis
            const title = document.querySelector('title');
            meta.title = {
                content: title ? title.innerText : null,
                length: title ? title.innerText.length : 0,
                status: title ? (title.innerText.length < 60 ? 'good' : 'too_long') : 'missing'
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

            return meta;
        });
    }

    async analyzeHeadings(page) {
        return await page.evaluate(() => {
            const headings = {};
            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
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

    async analyzeLinks(page) {
        return await page.evaluate(() => {
            const links = Array.from(document.getElementsByTagName('a'));
            return {
                total: links.length,
                internal: links.filter(link => {
                    try {
                        const url = new URL(link.href);
                        return url.hostname === window.location.hostname;
                    } catch (e) {
                        return false;
                    }
                }).length,
                external: links.filter(link => {
                    try {
                        const url = new URL(link.href);
                        return url.hostname !== window.location.hostname;
                    } catch (e) {
                        return false;
                    }
                }).length,
                links: links.map(link => ({
                    href: link.href,
                    text: link.textContent,
                    isInternal: true
                }))
            };
        });
    }

    async analyzePerformance(page) {
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        
        const performanceMetrics = await page.metrics();
        
        return {
            loadTime: performanceMetrics.TaskDuration,
            domContentLoaded: performanceMetrics.DomContentLoaded,
            firstPaint: performanceMetrics.FirstPaint
        };
    }

    async analyzeSEOElements(page) {
        const seoResults = await page.evaluate(() => {
            const results = {
                issues: []
            };

            // Check title
            const title = document.querySelector('title');
            if (!title) {
                results.issues.push({
                    type: 'meta_title',
                    severity: 'critical',
                    description: 'Missing meta title tag'
                });
            }

            // Check meta description
            const description = document.querySelector('meta[name="description"]');
            if (!description) {
                results.issues.push({
                    type: 'meta_description',
                    severity: 'critical',
                    description: 'Missing meta description tag'
                });
            }

            // Check h1
            const h1s = document.getElementsByTagName('h1');
            if (h1s.length === 0) {
                results.issues.push({
                    type: 'headings',
                    severity: 'critical',
                    description: 'Missing H1 heading'
                });
            }

            return results;
        });

        // Calculate SEO score
        seoResults.score = this.calculateSEOScore(seoResults.issues);
        return seoResults;
    }

    calculateSEOScore(issues) {
        let score = 100;
        issues.forEach(issue => {
            if (issue.severity === 'critical') score -= 10;
            if (issue.severity === 'warning') score -= 5;
        });
        return Math.max(0, score);
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = new SEOAnalyzer();