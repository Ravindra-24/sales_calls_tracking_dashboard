import { useEffect } from 'react';

interface PublicMetadataOptions {
  title: string;
  description: string;
  path?: string;
}

const configuredSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/$/, '') ?? '';

const getSiteUrl = () => {
  if (configuredSiteUrl) return configuredSiteUrl;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://smartlymanage.com';
};

export const usePublicMetadata = ({ title, description, path = '/' }: PublicMetadataOptions) => {
  useEffect(() => {
    const previousTitle = document.title;
    const canonicalUrl = `${getSiteUrl()}${path === '/' ? '/' : path}`;
    const restores: Array<() => void> = [];

    document.title = title;

    const setMeta = (selector: string, attribute: 'name' | 'property', key: string, value: string) => {
      let element = document.querySelector<HTMLMetaElement>(selector);
      const created = !element;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      const previous = element.content;
      element.content = value;
      restores.push(() => {
        if (created) element?.remove();
        else if (element) element.content = previous;
      });
    };

    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const canonicalCreated = !canonical;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    const previousCanonical = canonical.href;
    canonical.href = canonicalUrl;

    return () => {
      document.title = previousTitle;
      restores.reverse().forEach((restore) => restore());
      if (canonicalCreated) canonical?.remove();
      else if (canonical) canonical.href = previousCanonical;
    };
  }, [description, path, title]);
};
