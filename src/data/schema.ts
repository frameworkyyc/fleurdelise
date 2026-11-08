/**
 * Schema.org JSON-LD builders. VERIFIED FACTS ONLY (see docs/SEO-AUDIT.md §9):
 * name, owner, phone, email, tagline, Windsor ON, services Reiki/EFT/Tarot, the "in person or virtually, depending on the
 * service" statement. Optional facts (hours, price, street address, social profiles, credentials) are added automatically
 * once they exist in src/data/site.ts / service-content.ts — never invented here.
 *
 * SIT is deliberately NOT a Service/Offer until its launch. Before then /services/sit is a plain WebPage.
 */
import { site, services, sit } from './site';
import { serviceContent } from './service-content';

const id = (frag: string) => `${site.url}/#${frag}`;
const abs = (p: string) => new URL(p, site.url).href;

const city = { '@type': 'City', name: 'Windsor', containedInPlace: { '@type': 'AdministrativeArea', name: 'Ontario' } };

export function businessSchema(description: string) {
  const sameAs = Object.values(site.social).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'HealthAndBeautyBusiness'], // wellness — deliberately NOT a Medical* type
    '@id': id('business'),
    name: site.name, url: site.url, description, slogan: site.tagline.join(' '),
    image: abs('/brand/og-image.jpg'),
    logo: { '@type': 'ImageObject', url: abs('/brand/icon-512.png'), width: 512, height: 512 },
    telephone: '+1-226-346-7206', email: site.email,
    address: { '@type': 'PostalAddress', addressLocality: 'Windsor', addressRegion: 'ON', addressCountry: 'CA' },
    areaServed: city,
    founder: { '@id': id('lise') },
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', telephone: '+1-226-346-7206', email: site.email },
    hasOfferCatalog: {
      '@type': 'OfferCatalog', name: 'Services',
      itemListElement: services.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', '@id': abs(`${s.href}#service`), name: s.name, url: abs(s.href) } })),
    },
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export const websiteSchema = () => ({
  '@context': 'https://schema.org', '@type': 'WebSite', '@id': id('website'), name: site.name, url: site.url, inLanguage: 'en-CA',
  publisher: { '@id': id('business') },
});

export const personSchema = () => ({
  '@context': 'https://schema.org', '@type': 'Person', '@id': id('lise'), name: site.owner, jobTitle: 'Holistic wellness practitioner',
  url: abs('/about'), worksFor: { '@id': id('business') },
  address: { '@type': 'PostalAddress', addressLocality: 'Windsor', addressRegion: 'ON', addressCountry: 'CA' },
  ...(site.lise.credentials?.length ? { hasCredential: site.lise.credentials.map((c) => ({ '@type': 'EducationalOccupationalCredential', name: c })) } : {}),
});

export const breadcrumbSchema = (trail: { name: string; href: string }[]) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: abs(t.href) })),
});

/** Service schema for services that are available now (Reiki / EFT / Tarot). No price/duration until supplied. */
export function serviceSchema(slug: 'reiki' | 'eft' | 'tarot') {
  const c = serviceContent[slug];
  const d = c.details;
  return {
    '@context': 'https://schema.org', '@type': 'Service', '@id': abs(`/services/${slug}#service`),
    name: c.name, url: abs(`/services/${slug}`), description: c.metaDescription, serviceType: c.name,
    provider: { '@id': id('business') }, areaServed: city,
    ...(d?.price ? { offers: { '@type': 'Offer', description: d.price } } : {}),
  };
}

/**
 * SIT: a coming-soon WebPage — NOT a Service/Offer. On launch day (May 1, 2027) this is switched to serviceSchema() by hand
 * together with the page copy, booking, nav and sitemap content (see docs/SEO-AUDIT.md). It is never flipped automatically,
 * so a rebuild can never advertise SIT while the page still says "coming soon".
 */
export function sitSchema() {
  return {
    '@context': 'https://schema.org', '@type': 'WebPage', '@id': abs('/services/sit#webpage'), url: abs('/services/sit'),
    name: `${sit.name} (SIT) — coming ${sit.launch}`,
    description: serviceContent.sit.metaDescription, inLanguage: 'en-CA',
    isPartOf: { '@id': id('website') }, about: { '@type': 'Thing', name: sit.name },
  };
}
