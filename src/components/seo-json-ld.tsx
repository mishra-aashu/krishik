import React from 'react';
import { Platform } from 'react-native';
import Head from 'expo-router/head';

interface SEOJsonLdProps {
  pageType?: 'home' | 'schemes' | 'desi' | 'explore' | 'chat';
}

export function SEOJsonLd({ pageType = 'home' }: SEOJsonLdProps) {
  if (Platform.OS !== 'web') {
    return null;
  }

  const domain = 'https://www.krishikmitra.site';

  // 1. Organization & App Schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'Krishik Mitra (कृषिक मित्र)',
    'applicationCategory': 'BusinessApplication',
    'operatingSystem': 'Web, Android, iOS',
    'url': domain,
    'description': 'भारत के किसानों के लिए AI कृषिक मित्र ऐप। पीएम-किसान सम्मान निधि, 75% सोलर पंप सब्सिडी, फसल बीमारी स्कैन, लाइव मंडी भाव और कम खर्चे वाली देसी तकनीकें।',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'INR'
    },
    'author': {
      '@type': 'Organization',
      'name': 'Krishik Mitra AI',
      'url': domain
    }
  };

  // 2. Rich FAQ Schema for Google Search Engine Snippets
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': [
      {
        '@type': 'Question',
        'name': 'पीएम-किसान सम्मान निधि योजना की ₹6,000 की किस्त कैसे चेक करें?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'कृषिक मित्र ऐप के सरकारी योजना सेक्शन में अपना राज्य और फसल चुनकर पीएम-किसान का स्टेटस व आवेदन की पूरी जानकारी तुरंत प्राप्त करें।'
        }
      },
      {
        '@type': 'Question',
        'name': 'जीवामृत और नीमास्त्र जैविक खाद कैसे बनाएं?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'कृषिक मित्र देसी तकनीक सेक्शन में 10kg देशी गाय के गोबर, 10L गोमूत्र, 2kg गुड़ व बेसन से 200L जीवामृत बनाने की सटीक 5-दिवसीय विधि उपलब्ध है।'
        }
      },
      {
        '@type': 'Question',
        'name': 'पीएम-कुसुम योजना के तहत 75% सोलर पंप सब्सिडी कैसे मिलती है?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'पीएम-कुसुम योजना में केंद्र और राज्य सरकार मिलकर 60% से 75% तक सोलर पंप सब्सिडी प्रदान करती हैं। आवश्यक दस्तावेज़: आधार कार्ड, ज़मीन के कागजात (खसरा/खतौनी) और बैंक खाता।'
        }
      },
      {
        '@type': 'Question',
        'name': 'फसल की पत्ती फोटो स्कैन करके बीमारी का इलाज कैसे पाएं?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'कृषिक मित्र ऐप में पत्ती की फोटो खींचकर अपलोड करें। एआई तुरंत रोग की पहचान करके जैविक (जैसे खट्टा मट्ठा, नीम तेल) व रासायनिक उपचार की सिफारिश करेगा।'
        }
      }
    ]
  };

  // 3. Breadcrumb Schema for Google Search Link Hierarchy
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      'position': 1,
      'name': 'मुख्य पृष्ठ (Home)',
      'item': domain
    }
  ];

  if (pageType === 'schemes') {
    breadcrumbItems.push({
      '@type': 'ListItem',
      'position': 2,
      'name': 'सरकारी योजनाएं (Govt Schemes)',
      'item': `${domain}/schemes`
    });
  } else if (pageType === 'desi') {
    breadcrumbItems.push({
      '@type': 'ListItem',
      'position': 2,
      'name': 'कम खर्च की देसी तकनीकें (Desi Farming)',
      'item': `${domain}/desi`
    });
  } else if (pageType === 'explore') {
    breadcrumbItems.push({
      '@type': 'ListItem',
      'position': 2,
      'name': 'कैलकुलेटर व फोटो जांच (Tools & Disease Scan)',
      'item': `${domain}/explore`
    });
  } else if (pageType === 'chat') {
    breadcrumbItems.push({
      '@type': 'ListItem',
      'position': 2,
      'name': 'एआई कृषिक मित्र चैट (AI Agronomy Chat)',
      'item': `${domain}/chat`
    });
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': breadcrumbItems
  };

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </Head>
  );
}
