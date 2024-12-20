const axios = require('axios');
const { JSDOM } = require('jsdom');
const logger = require('../utils/logger');

class SEOAnalyzer {
    constructor() {
        this.PAGESPEED_API_KEY = process.env.GOOGLE_PAGESPEED_API_KEY;
    }

    async analyzePage(url) {
        try {
            const response = await axios.get(url);
            const dom = new JSDOM(response.data);
            const document = dom.window.document;

            const [pageSpeedData, robotsTxtData, sitemapData] = await Promise.all([
                this.getPageSpeedData(url),
                this.analyzeRobotsTxt(url),
                this.analyzeSitemap(url)
            ]);

            const results = {
                meta: this.analyzeMeta(document),
                headings: this.analyzeHeadings(document),
                images: this.analyzeImages(document),
                links: await this.analyzeLinks(document, url),
                performance: {
                    pageSpeed: pageSpeedData.pageSpeed,
                    coreWebVitals: pageSpeedData.coreWebVitals
                },
                analytics: this.analyzeAnalytics(document),
                schema: this.analyzeSchema(document),
                social: this.analyzeSocialMedia(document),
                technical: {
                    ssl: url.startsWith('https'),
                    httpToHttps: this.checkHttpToHttps(url),
                    robotsTxt: robotsTxtData,
                    sitemap: sitemapData
                }
            };

            return results;
        } catch (error) {
            logger.error('Error analyzing page:', error);
            throw error;
        }
    }

    async getPageSpeedData(url) {
        try {
            const strategies = ['mobile', 'desktop'];
            const results = await Promise.all(
                strategies.map(strategy =>
                    axios.get(
                        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${this.PAGESPEED_API_KEY}`
                    )
                )
            );

            const [mobileData, desktopData] = results.map(r => r.data);

            return {
                pageSpeed: {
                    mobile: Math.round(mobileData.lighthouseResult.categories.performance.score * 100),
                    desktop: Math.round(desktopData.lighthouseResult.categories.performance.score * 100)
                },
                coreWebVitals: {
                    fcp: mobileData.lighthouseResult.audits['first-contentful-paint'].numericValue / 1000,
                    lcp: mobileData.lighthouseResult.audits['largest-contentful-paint'].numericValue / 1000,
                    cls: mobileData.lighthouseResult.audits['cumulative-layout-shift'].numericValue,
                    status: this.getCWVStatus(mobileData.lighthouseResult)
                }
            };
        } catch (error) {
            logger.error('Error fetching PageSpeed data:', error);
            return {
                pageSpeed: { mobile: 0, desktop: 0 },
                coreWebVitals: { fcp: 0, lcp: 0, cls: 0, status: 'error' }
            };
        }
    }

    analyzeMeta(document) {
        return {
            title: {
                content: document.querySelector('title')?.textContent || '',
                length: document.querySelector('title')?.textContent?.length || 0,
                status: this.getMetaTitleStatus(document.querySelector('title')?.textContent)
            },
            description: {
                content: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
                length: document.querySelector('meta[name="description"]')?.getAttribute('content')?.length || 0,
                status: this.getMetaDescriptionStatus(document.querySelector('meta[name="description"]')?.getAttribute('content'))
            },
            openGraph: this.analyzeOpenGraph(document)
        };
    }

    getMetaTitleStatus(title) {
        if (!title) return 'error';
        const length = title.length;
        if (length >= 45 && length <= 60) return 'good';
        if (length < 45) return 'warning';
        return 'error';
    }

    getMetaDescriptionStatus(desc) {
        if (!desc) return 'error';
        const length = desc.length;
        if (length >= 145 && length <= 155) return 'good';
        if (length < 145) return 'warning';
        return 'error';
    }

    analyzeHeadings(document) {
        const headings = {};
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
            const elements = document.getElementsByTagName(tag);
            headings[tag] = Array.from(elements).map(el => ({
                content: el.textContent,
                length: el.textContent.length
            }));
        });
        return {
            structure: {
                isValid: headings.h1.length === 1,
                issues: this.getHeadingIssues(headings)
            },
            ...headings
        };
    }

    getHeadingIssues(headings) {
        const issues = [];
        if (headings.h1.length === 0) {
            issues.push('Missing H1 tag');
        } else if (headings.h1.length > 1) {
            issues.push('Multiple H1 tags found');
        }
        return issues;
    }

    analyzeImages(document) {
        return Array.from(document.getElementsByTagName('img')).map(img => ({
            src: img.src,
            alt: img.alt,
            hasAlt: !!img.alt,
            optimized: this.isImageOptimized(img)
        }));
    }

    isImageOptimized(img) {
        // Basic image optimization check
        const src = img.getAttribute('src');
        return src && (
            src.endsWith('.webp') ||
            src.includes('optimize') ||
            src.includes('compressed')
        );
    }

    async analyzeLinks(document, baseUrl) {
        const links = Array.from(document.getElementsByTagName('a'));
        const linkObjects = links.map(link => ({
            href: new URL(link.href, baseUrl).href,
            text: link.textContent.trim(),
            isInternal: this.isInternalLink(link.href, baseUrl),
            hasTitle: !!link.title
        }));

        const brokenLinks = await this.checkBrokenLinks(linkObjects);

        return {
            total: links.length,
            internal: linkObjects.filter(l => l.isInternal).length,
            external: linkObjects.filter(l => !l.isInternal).length,
            broken: brokenLinks
        };
    }

    isInternalLink(href, baseUrl) {
        try {
            const url = new URL(href, baseUrl);
            return url.hostname === new URL(baseUrl).hostname;
        } catch {
            return false;
        }
    }

    async checkBrokenLinks(links) {
        const brokenLinks = [];
        for (const link of links) {
            try {
                await axios.head(link.href);
            } catch {
                brokenLinks.push(link);
            }
        }
        return brokenLinks;
    }

    analyzeAnalytics(document) {
        return {
            googleAnalytics: this.detectGoogleAnalytics(document),
            tagManager: this.detectTagManager(document),
            facebookPixel: this.detectFacebookPixel(document)
        };
    }

    detectGoogleAnalytics(document) {
        // Check for GA4
        const ga4Script = document.querySelector('script[src*="gtag/js"]');
        const ga4Config = document.querySelector('script:not([src])');
        const ga4Match = ga4Config?.textContent?.match(/G-[A-Z0-9]+/);

        if (ga4Script || ga4Match) {
            return {
                exists: true,
                type: 'GA4',
                id: ga4Match?.[0] || ga4Script?.src?.split('?id=')?.[1],
                issues: []
            };
        }

        // Check for Universal Analytics
        const uaScript = document.querySelector('script:not([src])');
        const uaMatch = uaScript?.textContent?.match(/UA-[0-9]+-[0-9]+/);

        return {
            exists: !!uaMatch,
            type: uaMatch ? 'UA' : null,
            id: uaMatch?.[0],
            issues: []
        };
    }

    detectTagManager(document) {
        const gtmScript = document.querySelector('script[src*="googletagmanager"]');
        const gtmMatch = gtmScript?.src?.match(/GTM-[A-Z0-9]+/) || 
                        document.documentElement.innerHTML.match(/GTM-[A-Z0-9]+/);

        return {
            exists: !!gtmMatch,
            id: gtmMatch?.[0],
            issues: []
        };
    }

    detectFacebookPixel(document) {
        const fbPixelMatch = document.documentElement.innerHTML.match(/fbq\('init', '(\d+)'\)/);

        return {
            exists: !!fbPixelMatch,
            id: fbPixelMatch?.[1],
            issues: []
        };
    }

    analyzeSchema(document) {
        const schemas = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
            .map(script => {
                try {
                    return JSON.parse(script.textContent);
                } catch {
                    return null;
                }
            })
            .filter(Boolean);

        return {
            exists: schemas.length > 0,
            types: schemas.map(s => s['@type']).filter(Boolean),
            isValid: schemas.every(s => s['@context'] && s['@type']),
            data: schemas
        };
    }

    analyzeSocialMedia(document) {
        const socialLinks = {
            facebook: null,
            instagram: null,
            linkedin: null,
            twitter: null
        };

        const socialPatterns = {
            facebook: /facebook\.com/,
            instagram: /instagram\.com/,
            linkedin: /linkedin\.com/,
            twitter: /twitter\.com/
        };

        document.querySelectorAll('a[href]').forEach(link => {
            const href = link.href;
            Object.entries(socialPatterns).forEach(([platform, pattern]) => {
                if (pattern.test(href)) {
                    socialLinks[platform] = href;
                }
            });
        });

        return socialLinks;
    }

    async analyzeRobotsTxt(url) {
        try {
            const robotsUrl = new URL('/robots.txt', url).href;
            const response = await axios.get(robotsUrl);
            return {
                exists: true,
                content: response.data,
                hasSitemap: response.data.toLowerCase().includes('sitemap'),
                issues: []
            };
        } catch {
            return {
                exists: false,
                content: '',
                hasSitemap: false,
                issues: ['Robots.txt not found']
            };
        }
    }

    async analyzeSitemap(url) {
        try {
            const sitemapUrl = new URL('/sitemap.xml', url).href;
            const response = await axios.get(sitemapUrl);
            const urlCount = (response.data.match(/<url>/g) || []).length;
            return {
                exists: true,
                urlCount,
                issues: []
            };
        } catch {
            return {
                exists: false,
                urlCount: 0,
                issues: ['Sitemap not found']
            };
        }
    }

    checkHttpToHttps(url) {
        return url.startsWith('https');
    }

    getCWVStatus(lighthouse) {
        const scores = {
            FCP: lighthouse.audits['first-contentful-paint'].score,
            LCP: lighthouse.audits['largest-contentful-paint'].score,
            CLS: lighthouse.audits['cumulative-layout-shift'].score
        };

        if (Object.values(scores).every(score => score >= 0.9)) return 'good';
        if (Object.values(scores).every(score => score >= 0.5)) return 'needs-improvement';
        return 'poor';
    }
}

module.exports = new SEOAnalyzer();