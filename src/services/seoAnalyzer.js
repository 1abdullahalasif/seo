// src/services/seoAnalyzer.js
const puppeteer = require('puppeteer-core');
const axios = require('axios');

class SEOAnalyzer {
    constructor() {
        this.browser = null;
    }

    async initialize() {
        try {
            this.browser = await puppeteer.launch({
                headless: true,
                executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-software-rasterizer'
                ]
            });
        } catch (error) {
            console.error('Browser launch error:', error);
            throw error;
        }
    }

    async analyzePage(url) {
        if (!this.browser) {
            await this.initialize();
        }

        const page = await this.browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        try {
            await page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });

            const results = {
                meta: await this.analyzeMeta(page),
                headings: await this.analyzeHeadings(page),
                images: await this.analyzeImages(page),
                links: await this.analyzeLinks(page, url),
                social: await this.analyzeSocialMedia(page),
                tracking: await this.analyzeTrackingCodes(page),
                performance: await this.analyzePerformance(page),
                technical: await this.analyzeTechnical(page, url),
                accessibility: await this.analyzeAccessibility(page),
                schema: await this.analyzeSchema(page),
                robotsTxt: await this.analyzeRobotsTxt(url),
                sitemap: await this.analyzeSitemap(url)
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
            const meta = {
                title: {
                    content: document.querySelector('title')?.innerText || null,
                    length: document.querySelector('title')?.innerText.length || 0
                },
                description: {
                    content: document.querySelector('meta[name="description"]')?.getAttribute('content') || null,
                    length: document.querySelector('meta[name="description"]')?.getAttribute('content')?.length || 0
                },
                keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.split(',').map(k => k.trim()) || [],
                favicon: document.querySelector('link[rel="icon"], link[rel="shortcut icon"]')?.href || null,
                canonical: document.querySelector('link[rel="canonical"]')?.href || null,
                viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content') || null,
                charset: document.characterSet || null,
                language: document.documentElement.lang || null
            };

            // Open Graph
            meta.openGraph = {
                title: document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
                description: document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
                image: document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
                url: document.querySelector('meta[property="og:url"]')?.getAttribute('content')
            };

            // Twitter Card
            meta.twitter = {
                card: document.querySelector('meta[name="twitter:card"]')?.getAttribute('content'),
                title: document.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
                description: document.querySelector('meta[name="twitter:description"]')?.getAttribute('content'),
                image: document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
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
                    length: el.innerText.length,
                    hasKeywords: true, // This should be implemented based on target keywords
                    isVisible: el.getBoundingClientRect().height > 0
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
                },
                loading: img.loading || 'eager',
                isResponsive: img.srcset ? true : false,
                fileSize: img.dataset.filesize || null
            }));
        });
    }

    async analyzeTrackingCodes(page) {
        return await page.evaluate(() => {
            const pageSource = document.documentElement.innerHTML;
            
            return {
                googleAnalytics: {
                    present: pageSource.includes('google-analytics.com/analytics.js') || 
                            pageSource.includes('gtag') || 
                            !!pageSource.match(/UA-\d+-\d+/) ||
                            !!pageSource.match(/G-[A-Z0-9]+/),
                    type: pageSource.includes('gtag') ? 'GA4' : 'Universal Analytics',
                    id: (pageSource.match(/UA-\d+-\d+/) || pageSource.match(/G-[A-Z0-9]+/) || [null])[0]
                },
                googleTagManager: {
                    present: pageSource.includes('googletagmanager.com/gtm.js'),
                    id: (pageSource.match(/GTM-[A-Z0-9]+/) || [null])[0]
                },
                facebookPixel: {
                    present: pageSource.includes('connect.facebook.net') || pageSource.includes('fbq('),
                    id: (pageSource.match(/fbq\('init',\s*'(\d+)'\)/) || [null, null])[1]
                }
            };
        });
    }

    async analyzeSocialMedia(page) {
        return await page.evaluate(() => {
            const links = Array.from(document.getElementsByTagName('a'));
            const socialProfiles = {
                facebook: null,
                linkedin: null,
                instagram: null,
                tiktok: null
            };

            links.forEach(link => {
                const href = link.href.toLowerCase();
                if (href.includes('facebook.com/')) socialProfiles.facebook = href;
                if (href.includes('linkedin.com/')) socialProfiles.linkedin = href;
                if (href.includes('instagram.com/')) socialProfiles.instagram = href;
                if (href.includes('tiktok.com/')) socialProfiles.tiktok = href;
            });

            return socialProfiles;
        });
    }

    async analyzeLinks(page, baseUrl) {
        const links = await page.evaluate(() => {
            return Array.from(document.getElementsByTagName('a')).map(link => ({
                href: link.href,
                text: link.textContent.trim(),
                isInternal: link.href.includes(window.location.hostname),
                hasTitle: !!link.title,
                nofollow: link.rel.includes('nofollow'),
                target: link.target
            }));
        });

        const brokenLinks = [];
        for (const link of links) {
            if (link.href && !link.href.startsWith('mailto:') && !link.href.startsWith('tel:')) {
                try {
                    const response = await axios.head(link.href, { 
                        timeout: 5000,
                        validateStatus: false 
                    });
                    if (response.status >= 400) {
                        brokenLinks.push({
                            ...link,
                            statusCode: response.status
                        });
                    }
                } catch (error) {
                    brokenLinks.push({
                        ...link,
                        error: error.message
                    });
                }
            }
        }

        return {
            total: links.length,
            internal: links.filter(l => l.isInternal).length,
            external: links.filter(l => !l.isInternal).length,
            broken: brokenLinks,
            nofollow: links.filter(l => l.nofollow).length
        };
    }

    async analyzeSchema(page) {
        return await page.evaluate(() => {
            const schemas = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            return {
                present: schemas.length > 0,
                count: schemas.length,
                types: schemas.map(schema => {
                    try {
                        const parsed = JSON.parse(schema.textContent);
                        return parsed['@type'];
                    } catch (e) {
                        return 'Invalid Schema';
                    }
                })
            };
        });
    }

    async analyzeTechnical(page, url) {
        const [ssl, gzip] = await Promise.all([
            this.checkSSL(url),
            this.checkGzip(url)
        ]);

        const technical = await page.evaluate(() => ({
            doctype: document.doctype ? document.doctype.name : null,
            charset: document.characterSet,
            viewport: document.querySelector('meta[name="viewport"]')?.content,
            language: document.documentElement.lang,
            inlineStyles: document.getElementsByTagName('style').length,
            inlineScripts: Array.from(document.getElementsByTagName('script'))
                .filter(s => !s.src).length
        }));

        return {
            ...technical,
            ssl,
            gzip
        };
    }

    async analyzeRobotsTxt(url) {
        try {
            const robotsUrl = new URL('/robots.txt', url).href;
            const response = await axios.get(robotsUrl);
            return {
                exists: true,
                content: response.data,
                hasSitemap: response.data.toLowerCase().includes('sitemap:'),
                sitemapUrls: (response.data.match(/Sitemap: (.*)/g) || [])
                    .map(line => line.replace('Sitemap:', '').trim())
            };
        } catch (error) {
            return {
                exists: false,
                error: error.message
            };
        }
    }

    async analyzeSitemap(url) {
        try {
            const sitemapUrl = new URL('/sitemap.xml', url).href;
            const response = await axios.get(sitemapUrl);
            return {
                exists: true,
                content: response.data,
                urlCount: (response.data.match(/<url>/g) || []).length,
                lastmod: (response.data.match(/<lastmod>(.*?)<\/lastmod>/g) || []).length > 0
            };
        } catch (error) {
            return {
                exists: false,
                error: error.message
            };
        }
    }

    async analyzePerformance(page) {
        const metrics = await page.metrics();
        const performanceTiming = await page.evaluate(() => {
            const timing = window.performance.timing;
            return {
                loadTime: timing.loadEventEnd - timing.navigationStart,
                domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                firstPaint: performance.getEntriesByType('paint')[0]?.startTime || null
            };
        });

        return {
            ...performanceTiming,
            jsHeapSize: metrics.JSHeapUsedSize,
            nodes: metrics.Nodes,
            resources: await page.evaluate(() => 
                performance.getEntriesByType('resource').length
            )
        };
    }

    async analyzeAccessibility(page) {
        return await page.evaluate(() => {
            const issues = [];

            // Check image alt texts
            document.querySelectorAll('img').forEach(img => {
                if (!img.alt && !img.getAttribute('role') === 'presentation') {
                    issues.push({
                        type: 'image_alt',
                        element: 'img',
                        src: img.src,
                        issue: 'Missing alt text'
                    });
                }
            });

            // Check form labels
            document.querySelectorAll('input, select, textarea').forEach(field => {
                if (!field.id || !document.querySelector(`label[for="${field.id}"]`)) {
                    issues.push({
                        type: 'form_label',
                        element: field.tagName.toLowerCase(),
                        issue: 'Missing label'
                    });
                }
            });

            return {
                issues,
                totalIssues: issues.length,
                passedChecks: [
                    'language',
                    'doctype',
                    'viewport'
                ].filter(check => {
                    switch(check) {
                        case 'language':
                            return !!document.documentElement.lang;
                        case 'doctype':
                            return !!document.doctype;
                        case 'viewport':
                            return !!document.querySelector('meta[name="viewport"]');
                        default:
                            return false;
                    }
                })
            };
        });
    }

    async checkSSL(url) {
        try {
            const response = await axios.get(url);
            return {
                secure: url.startsWith('https'),
                certificate: response.request.res.socket.getPeerCertificate()
            };
        } catch (error) {
            return {
                secure: url.startsWith('https'),
                error: error.message
            };
        }
    }

    async checkGzip(url) {
        try {
            const response = await axios.get(url);
            return {
                enabled: response.headers['content-encoding'] === 'gzip',
                encoding: response.headers['content-encoding']
            };
        } catch (error) {
            return {
                enabled: false,
                error: error.message
            };
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

module.exports = new SEOAnalyzer();