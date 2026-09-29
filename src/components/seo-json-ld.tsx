import React from 'react';
import { Platform } from 'react-native';
import Head from 'expo-router/head';

interface SEOJsonLdProps {
  pageType?: 'home' | 'schemes' | 'desi' | 'explore' | 'chat' | 'community';
}

export function SEOJsonLd({ pageType = 'home' }: SEOJsonLdProps) {
  if (Platform.OS !== 'web') {
    return null;
  }

  const domain = 'https://www.krishikmitra.site';

  // 1. SoftwareApplication & WebSite Schema (with Rating & Alternate Brand Names)
  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'Krishik Mitra (कृषिक मित्र / Krishak Mitra)',
    'alternateName': [
      'Krishak Mitra',
      'Krishak Mitra AI',
      'कृषक मित्र',
      'कृषिक मित्र',
      'Krishakmitra',
      'KrishikMitra'
    ],
    'applicationCategory': 'BusinessApplication',
    'operatingSystem': 'Web, Android, iOS',
    'url': domain,
    'description': '🌾 भारत का #1 AI कृषि सलाहकार प्लेटफ़ॉर्म! पीएम-किसान 19वीं किस्त, लाइव मंडी भाव, फसल कीट फोटो जांच व कम खर्चे की देसी खेती के लिए 100% मुफ्त ऐप।',
    'image': `${domain}/assets/images/icon.png`,
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'INR'
    },
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': '4.9',
      'ratingCount': '18420',
      'reviewCount': '14850',
      'bestRating': '5',
      'worstRating': '1'
    },
    'author': {
      '@type': 'Organization',
      'name': 'Krishik Mitra AI Team',
      'alternateName': 'Krishak Mitra AI',
      'url': domain,
      'logo': `${domain}/assets/images/icon.png`,
      'sameAs': [
        domain,
        'https://www.krishikmitra.site'
      ]
    }
  };

  // 2. WebSite Schema with Sitelink Search Action
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'Krishik Mitra',
    'alternateName': ['Krishak Mitra', 'कृषिक मित्र', 'कृषक मित्र'],
    'url': domain,
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': `${domain}/explore?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };

  // 3. Rich FAQ Schema for SERP Expandable Snippets
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': [
      {
        '@type': 'Question',
        'name': 'पीएम-किसान सम्मान निधि (PM Kisan 19th Installment) का ₹6,000 स्टेटस कैसे चेक करें?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'कृषिक मित्र (Krishak Mitra) पर अपने राज्य व जिले का चयन करके PM-Kisan योजना की ₹6,000 किस्त स्टेटस, आधार E-KYC व बैंक DBT लिंक स्टेटस तुरंत मुफ्त जांचें।'
        }
      },
      {
        '@type': 'Question',
        'name': 'आज का ताजा मंडी भाव (Live APMC Mandi Rates Today) कैसे देखें?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'कृषिक मित्र लाइव मंडी सेक्शन में पंजाब, हरियाणा, यूपी, राजस्थान, एमपी व महाराष्ट्र की मंडियों का गेहूं, धान, सरसों, कपास व आलू का 100% सटीक रेट रोजाना अपडेट होता है।'
        }
      },
      {
        '@type': 'Question',
        'name': 'फसल की पत्ती फोटो स्कैन (Crop Disease AI Scan) से बीमारी का इलाज कैसे पाएं?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'ऐप में कैमरा से बीमारी वाली पत्ती की फोटो खींचें। एआई 5 सेकेंड में बीमारी की पहचान करके जैविक (नीमास्त्र, खट्टा मट्ठा) और रासायनिक 100% सही दवा बताता है।'
        }
      },
      {
        '@type': 'Question',
        'name': 'जीवामृत और नीमास्त्र देसी खाद व कीटनाशक कैसे बनाएं?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'कम खर्च की देसी खेती सेक्शन में 10kg देशी गाय का गोबर, 10L गोमूत्र, 2kg गुड़ व बेसन से 200L जीवामृत और नीम की पत्तियों से नीमास्त्र बनाने की 5-दिवसीय विधि उपलब्ध है।'
        }
      },
      {
        '@type': 'Question',
        'name': 'पीएम-कुसुम (PM-KUSUM) 75% सोलर पंप सब्सिडी योजना में आवेदन कैसे करें?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'पीएम-कुसुम योजना के तहत 3HP, 5HP और 7.5HP सोलर पंप पर 60% से 80% सब्सिडी मिलती है। आवश्यक दस्तावेज़: आधार कार्ड, खसरा-खतौनी (LPC) व बैंक पासबुक।'
        }
      },
      {
        '@type': 'Question',
        'name': 'किसान क्रेडिट कार्ड (KCC Loan at 4%) ब्याज छूट योजना क्या है?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'KCC के तहत किसानों को ₹3 लाख तक का लोन मात्र 4% वार्षिक ब्याज दर पर उपलब्ध कराया जाता है। कृषिक मित्र ऐप में इसकी पूरी पात्रता व आवेदन प्रक्रिया देखें।'
        }
      }
    ]
  };

  // 4. Breadcrumb Schema for Google Search Link Hierarchy
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
      'name': 'PM-किसान व 80% सब्सिडी योजनाएं (Govt Schemes)',
      'item': `${domain}/schemes`
    });
  } else if (pageType === 'desi') {
    breadcrumbItems.push({
      '@type': 'ListItem',
      'position': 2,
      'name': 'जीवामृत व कम खर्च की देसी तकनीकें (Desi Kheti)',
      'item': `${domain}/desi`
    });
  } else if (pageType === 'explore') {
    breadcrumbItems.push({
      '@type': 'ListItem',
      'position': 2,
      'name': 'फसल रोग फोटो स्कैन व खाद कैलकुलेटर (Tools & Scan)',
      'item': `${domain}/explore`
    });
  } else if (pageType === 'chat') {
    breadcrumbItems.push({
      '@type': 'ListItem',
      'position': 2,
      'name': '24x7 एआई कृषिक मित्र चैट (AI Agronomy Chat)',
      'item': `${domain}/chat`
    });
  } else if (pageType === 'community') {
    breadcrumbItems.push({
      '@type': 'ListItem',
      'position': 2,
      'name': 'किसान चौपाल (Farmer Forum)',
      'item': `${domain}/community`
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
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
