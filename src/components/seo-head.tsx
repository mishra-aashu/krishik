import React from 'react';
import { Platform } from 'react-native';
import Head from 'expo-router/head';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  keywords?: string;
}

export const DEFAULT_SEO = {
  domain: 'https://www.krishikmitra.site',
  title: 'Krishik Mitra (कृषिक मित्र) - PM-Kisan, Desi Kheti & AI Agronomy',
  description: 'भारत के किसानों के लिए AI कृषिक मित्र ऐप। पीएम-किसान सम्मान निधि, 75% सोलर पंप सब्सिडी, फसल बीमारी फोटो स्कैन, लाइव मंडी भाव और कम खर्चे वाली देसी तकनीकें (जीवामृत, नीमास्त्र)।',
  ogImage: 'https://www.krishikmitra.site/assets/images/icon.png',
  keywords: 'PM Kisan, Krishi Mitra, Desi Kheti, Organic Farming, Mandi Bhav, Crop Disease Scan, Govt Schemes India, Kisan Helpline, Jeevamrut, Neemastra, Solar Pump Subsidy, KCC Loan',
};

export function SEOHead({
  title = DEFAULT_SEO.title,
  description = DEFAULT_SEO.description,
  canonicalPath = '',
  ogImage = DEFAULT_SEO.ogImage,
  keywords = DEFAULT_SEO.keywords,
}: SEOHeadProps) {
  if (Platform.OS !== 'web') {
    return null;
  }

  const fullUrl = `${DEFAULT_SEO.domain}${canonicalPath}`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Krishik Mitra AI Team" />
      <meta name="google-site-verification" content="H4x0BC-cs10TFan-NyBuwNCOUvbOYu2_GyCpU9ZAi9M" />
      <link rel="canonical" href={fullUrl} />

      {/* OpenGraph / Facebook SEO */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Krishik Mitra (कृषिक मित्र)" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="hi_IN" />
      <meta property="og:locale:alternate" content="en_IN" />

      {/* Twitter Cards SEO */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* PWA & Mobile Web Optimization */}
      <meta name="theme-color" content="#059669" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="Krishik Mitra" />
      <link rel="manifest" href="/manifest.json" />
    </Head>
  );
}
