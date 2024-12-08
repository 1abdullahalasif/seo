// src/services/seoAnalyzer.js
const axios = require('axios');
const { JSDOM } = require('jsdom');

class SEOAnalyzer {
    async analyzePage(url) {
        try {
            const response = await axios.get(url);
            const dom = new JSDOM(response.data);
            const document = dom.window.document;

            const results = {
                meta: this.analyzeMeta(document),
                headings: this.analyzeHeadings(document),
                images: this.analyzeImages(document),
                links: await this.analyzeLinks(document, url),
                performance: {
                    pageSize: response.headers['content-length'],
                    loadTime: response.timings?.elapsedTime
                },
                technical: await this.analyzeTechnical(url, response),
                robotsTxt: await this.analyzeRobotsTxt(url),
                sitemap: await this.analyzeSitemap(url)
            };

            return results;
        } catch (error) {
            console.error('Error analyzing page:', error);
            throw error;
        }
    }

    analyzeMeta(document) {
        return {
            title: {
                content: document.querySelector('title')?.textContent || null,
                length: document.querySelector('title')?.textContent?.length || 0
            },
            description: {
                content: document.querySelector('meta[name="description"]')?.getAttribute('content') || null,
                length: document.querySelector('meta[name="description"]')?.getAttribute('content')?.length || 0
            },
            keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.split(',').map(k => k.trim()) || [],
            favicon: document.querySelector('link[rel="icon"], link[rel="shortcut icon"]')?.href || null,
            canonical: document.querySelector('link[rel="canonical"]')?.href || null
        };
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
        return headings;
    }

    analyzeImages(document) {
        const images = Array.from(document.getElementsByTagName('img'));
        return images.map(img => ({
            src: img.src,
            alt: img.alt,
            hasAlt: !!img.alt
        }));
    }

    async analyzeLinks(document, baseUrl) {
        const links = Array.from(document.getElementsByTagName('a'));
        const linkObjects = links.map(link => ({
            href: link.href,
            text: link.textContent.trim(),
            isInternal: link.href.includes(new URL(baseUrl).hostname),
            hasTitle: !!link.title
        }));

        // Check for broken links
        const brokenLinks = [];
        for (const link of linkObjects) {
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
            internal: linkObjects.filter(l => l.isInternal).length,
            external: linkObjects.filter(l => !l.isInternal).length,
            broken: brokenLinks
        };
    }

    async analyzeTechnical(url, response) {
        return {
            ssl: url.startsWith('https'),
            headers: {
                server: response.headers['server'],
                contentType: response.headers['content-type'],
                cacheControl: response.headers['cache-control']
            }
        };
    }

    async analyzeRobotsTxt(url) {
        try {
            const robotsUrl = new URL('/robots.txt', url).href;
            const response = await axios.get(robotsUrl);
            return {
                exists: true,
                content: response.data,
                hasSitemap: response.data.toLowerCase().includes('sitemap:')
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
                urlCount: (response.data.match(/<url>/g) || []).length
            };
        } catch (error) {
            return {
                exists: false,
                error: error.message
            };
        }
    }
}

module.exports = new SEOAnalyzer();