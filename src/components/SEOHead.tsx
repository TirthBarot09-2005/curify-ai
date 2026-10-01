import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalPath: string;
  noIndex?: boolean;
  ogType?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_NAME = 'Curify AI';
const SITE_URL = 'https://curifyai.tech';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/hero-healthcare.jpg`;

/**
 * Manages document head metadata for SEO.
 * Sets title, meta description, canonical, Open Graph, Twitter Cards,
 * robots directives, and JSON-LD structured data.
 *
 * For React SPAs without SSR, this is the standard approach to per-page SEO.
 * Google's crawler can execute JavaScript and will pick up these tags.
 */
export default function SEOHead({
  title,
  description,
  canonicalPath,
  noIndex = false,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  jsonLd,
}: SEOHeadProps) {
  useEffect(() => {
    // Title
    const fullTitle = canonicalPath === '/'
      ? `${SITE_NAME} — Healthcare Decisions, Made Clearer`
      : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    // Helper to set or create a meta tag
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Meta description
    setMeta('name', 'description', description);

    // Robots
    setMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    // Canonical
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;
    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    // Open Graph
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:locale', 'en_IN');

    // Twitter Cards
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', ogImage);

    // JSON-LD structured data
    // Remove any previously injected JSON-LD from this component
    document.querySelectorAll('script[data-seo-head="true"]').forEach(el => el.remove());

    if (jsonLd) {
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      items.forEach(data => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo-head', 'true');
        script.textContent = JSON.stringify(data);
        document.head.appendChild(script);
      });
    }

    // Cleanup: remove JSON-LD when component unmounts
    return () => {
      document.querySelectorAll('script[data-seo-head="true"]').forEach(el => el.remove());
    };
  }, [title, description, canonicalPath, noIndex, ogType, ogImage, jsonLd]);

  return null;
}
