import { useEffect } from 'react';
import { useLang } from '@/i18n';

export const SITE_URL = 'https://guti.rakibhasansohag.com';
const OG_IMAGE = `${SITE_URL}/og/guti-arena.png`;

interface Props {
  /** Site path, e.g. "/" or "/how-to-play". */
  path: string;
  title: string;
  description: string;
  /** JSON-LD objects for this page. */
  jsonLd?: object[];
}

/** Per-page head tags. React 19 hoists title, meta and link into <head>. */
export function Seo({ path, title, description, jsonLd = [] }: Props) {
  const lang = useLang();
  const bn = SITE_URL + path;
  const en = `${bn}?lang=en`;
  const url = lang === 'en' ? en : bn;
  // index.html keeps a fallback <title> for client-rendered routes; make sure this one wins.
  useEffect(() => {
    document.title = title;
  }, [title]);
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <link rel="alternate" hrefLang="bn" href={bn} />
      <link rel="alternate" hrefLang="en" href={en} />
      <link rel="alternate" hrefLang="x-default" href={bn} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Guti Arena" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content={lang === 'en' ? 'en_US' : 'bn_BD'} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />
      {jsonLd.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  );
}
