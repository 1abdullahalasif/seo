// src/services/seoAnalyzer.js
const puppeteer = require('puppeteer');
const axios = require('axios');

class SEOAnalyzer {
    constructor() {
        this.browser = null;
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
        });
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
                technical: await this.analyzeTechnical(page, url),
                performance: await this.analyzePerformance(page),
                tracking: await this.analyzeTrackingCodes(page),
                accessibility: await this.analyzeAccessibility(page),
                schema: await this.analyzeSchema(page),
                robotsTxt: await this.analyzeRobotsTxt(url),
                sitemap: await this.analyzeSitemap(url),
                mobileCompatibility: await this.analyzeMobileCompatibility(url)
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

            // Meta keywords analysis
            const keywords = document.querySelector('meta[name="keywords"]');
            meta.keywords = keywords ? 
                keywords.getAttribute('content').split(',').map(k => k.trim()) 
                : [];

            // Canonical URL
            const canonical = document.querySelector('link[rel="canonical"]');
            meta.canonical = {
                exists: !!canonical,
                href: canonical ? canonical.href : null
            };

            // Check for duplicates
            const allMeta = document.getElementsByTagName('meta');
            const metaTitles = document.getElementsByTagName('title');
            
            meta.duplicates = {
                title: metaTitles.length > 1,
                description: Array.from(allMeta).filter(m => m.name === 'description').length > 1
            };

            // Favicon
            const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
            meta.favicon = {
                exists: !!favicon,
                href: favicon ? favicon.href : null
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
                    count: 1,
                    length: el.innerText.length
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
                size: img.dataset.filesize
            }));
        });
    }

    async analyzeTrackingCodes(page) {
        return await page.evaluate(() => {
            const tracking = {
                googleAnalytics: {
                    present: false,
                    type: null,
                    id: null
                },
                googleTagManager: {
                    present: false,
                    id: null
                },
                facebookPixel: {
                    present: false,
                    id: null
                }
            };

            // Check for GA4
            const pageSource = document.documentElement.innerHTML;
            const ga4Match = pageSource.match(/G-[A-Z0-9]+/);
            if (ga4Match) {
                tracking.googleAnalytics.present = true;
                tracking.googleAnalytics.type = 'GA4';
                tracking.googleAnalytics.id = ga4Match[0];
            }

            // Check for GTM
            const gtmMatch = pageSource.match(/GTM-[A-Z0-9]+/);
            if (gtmMatch) {
                tracking.googleTagManager.present = true;
                tracking.googleTagManager.id = gtmMatch[0];
            }

            // Check for Facebook Pixel
            const fbPixelMatch = pageSource.match(/fbq\('init',\s*'(\d+)'\)/);
            if (fbPixelMatch) {
                tracking.facebookPixel.present = true;
                tracking.facebookPixel.id = fbPixelMatch[1];
            }

            return tracking;
        });
    }

    async analyzeSocialMedia(page) {
        return await page.evaluate(() => {
            const socialProfiles = {
                facebook: null,
                linkedin: null,
                instagram: null,
                tiktok: null
            };

            // Find social media links
            const links = Array.from(document.getElementsByTagName('a'));
            links.forEach(link => {
                const href = link.href.toLowerCase();
                if (href.includes('facebook.com/')) {
                    socialProfiles.facebook = href;
                } else if (href.includes('linkedin.com/')) {
                    socialProfiles.linkedin = href;
                } else if (href.includes('instagram.com/')) {
                    socialProfiles.instagram = href;
                } else if (href.includes('tiktok.com/')) {
                    socialProfiles.tiktok = href;
                }
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
                target: link.target,
                rel: link.rel
            }));
        });

        // Check for broken links
        const brokenLinks = [];
        for (const link of links) {
            if (link.href && !link.href.startsWith('mailto:') && !link.href.startsWith('tel:')) {
                try {
                    const response = await axios.head(link.href, { timeout: 5000 });
                    if (response.status >= 400) {
                        brokenLinks.push(link);
                    }
                } catch (error) {
                    brokenLinks.push(link);
                }
            }
        }

        return {
            total: links.length,
            internal: links.filter(l => l.isInternal).length,
            external: links.filter(l => !l.isInternal).length,
            broken: brokenLinks,
            nofollow: links.filter(l => l.rel?.includes('nofollow')).length
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

    async analyzeRobotsTxt(url) {
        try {
            const robotsUrl = new URL('/robots.txt', url).href;
            const response = await axios.get(robotsUrl);
            
            const content = response.data;
            const sitemapUrls = content.match(/Sitemap: (.*)/g)?.map(line => 
                line.replace('Sitemap:', '').trim()
            ) || [];

            return {
                exists: true,
                content,
                hasSitemap: sitemapUrls.length > 0,
                sitemapUrls
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
                urlCount: (response.data.match(/<url>/g) || []).length,
                lastModified: new Date(),
                format: response.data.includes('<?xml') ? 'XML' : 'Other'
            };
        } catch (error) {
            return {
                exists: false,
                error: error.message
            };
        }
    }

    async analyzeMobileCompatibility(url) {
        try {
            const page = await this.browser.newPage();
            await page.setViewport({
                width: 375,
                height: 667,
                isMobile: true
            });

            await page.goto(url, { waitUntil: 'networkidle0' });
            
            const mobileMetrics = await page.evaluate(() => ({
                viewport: document.querySelector('meta[name="viewport"]')?.content,
                textSize: window.getComputedStyle(document.body).fontSize,
                tapTargets: Array.from(document.querySelectorAll('a, button, input, select, textarea'))
                    .map(el => {
                        const rect = el.getBoundingClientRect();
                        return {
                            width: rect.width,
                            height: rect.height
                        };
                    })
            }));

            await page.close();

            return {
                hasViewport: !!mobileMetrics.viewport,
                tapTargetsValid: mobileMetrics.tapTargets.every(t => t.width >= 48 && t.height >= 48),
                textSizeValid: parseInt(mobileMetrics.textSize) >= 16
            };
        } catch (error) {
            return {
                error: error.message
            };
        }
    }

    async analyzePerformance(page) {
        const metrics = await page.metrics();
        const performanceEntries = await page.evaluate(() => 
            JSON.stringify(performance.getEntriesByType('navigation'))
        );
        
        const navigationTiming = JSON.parse(performanceEntries)[0];

        return {
            loadTime: navigationTiming.loadEventEnd - navigationTiming.startTime,
            domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.startTime,
            firstPaint: metrics.FirstPaint,
            resourceCount: await page.evaluate(() => performance.getEntriesByType('resource').length),
            resourceSize: await page.evaluate(() => 
                performance.getEntriesByType('resource')
                    .reduce((total, resource) => total + resource.transferSize, 0)
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

            // Check ARIA labels
            document.querySelectorAll('[role]').forEach(el => {
                if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
                    issues.push({
                        type: 'aria_label',
                        element: el.tagName.toLowerCase(),
                        issue: 'Missing ARIA label'
                    });
                }
            });

            return {
                issues,
                totalIssues: issues.length
            };
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