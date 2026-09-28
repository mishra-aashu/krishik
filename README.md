# 🌾 Krishik Mitra (कृषिक मित्र)

> **Next-Gen AI Agronomy & Zero-Budget Farming Platform for Indian Farmers**  
> 🌐 **Live Site:** [https://www.krishikmitra.site](https://www.krishikmitra.site)

---

## 🌟 Overview (परिचय)

**Krishik Mitra (कृषिक मित्र)** is a mobile-first universal web application designed to empower Indian farmers with scientific agronomy advice, low-cost organic remedies, government scheme subsidies, and AI-driven crop health diagnostic tools. Built with simple, non-technical Hindi and English interfaces, full voice-microphone recognition, and 1-click language switching.

---

## 🚀 Key Features (मुख्य विशेषताएं)

- 🏛️ **PM-Kisan & Subsidy Finder (सरकारी योजना गाइड)**  
  State-wise & central government scheme finder covering PM-Kisan Samman Nidhi (₹6,000/yr), PM-KUSUM 75% Solar Pump Subsidy, Kisan Credit Card (KCC) loans, and PM Fasal Bima Yojana (Crop Insurance).

- 💡 **Low-Cost & Desi Farming Remedies (कम खर्च की देसी तकनीकें)**  
  Complete database and AI advisor for Zero-Budget Natural Farming (ZBNF) recipes including **Jeevamrut**, **Neemastra**, **Agniastra**, **Bottle Drip Irrigation**, **Yellow Sticky Traps**, and **Fermented Sour Buttermilk Spray**.

- 🍃 **AI Leaf Scan & Disease Diagnosis (फसल रोग फोटो जांच)**  
  Instant AI leaf photo diagnostic scanner identifying pests, fungal infestations, and leaf spot diseases with organic and chemical treatment recommendations.

- 🎙️ **Voice Microphone & 1-Click Language Switcher**  
  Voice speech-to-text recognition in Hindi and English with crisp 50–70 word AI answers tailored for farmers.

- 📊 **Crop & Soil Health Calculators (बीज व खाद कैलकुलेटर)**  
  Precision NPK fertilizer dosage calculation, seed rate estimations, and soil health card prescription recommendations.

- 📈 **Live Mandi Rates & Micro-Weather Forecast**  
  Real-time commodity market prices across Indian APMC mandis and localized agricultural weather advisories.

- 💬 **Farmers Chowpal (किसान चौपाल)**  
  Peer-to-peer farmer community discussion board for sharing crop experiences and regional farming updates.

---

## 🛠️ Tech Stack (प्रौद्योगिकी)

- **Framework:** [Expo SDK 57](https://expo.dev) / React Native 0.86 / React 19 / TypeScript 6
- **Routing & Navigation:** Expo Router (File-based typed routing)
- **Styling & Animations:** Custom Glassmorphism, React Native Reanimated 4, Expo Symbols
- **AI Engine:** Groq API (`llama-3.1-8b-instant`, `llama-3.3-70b-versatile`, `deepseek-r1-distill-llama-70b`) with multi-key rotation and intelligent offline agronomy fallback
- **Backend & Auth:** Supabase (Row Level Security, Authentication, Storage)
- **Deployment:** Vercel (Static Web Export & Serverless Cron Sync)

---

## 📦 Getting Started (शुरुआत कैसे करें)

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 2. Installation
```bash
# Clone repository
git clone https://github.com/mishra-aashu/krishik.git

# Navigate into directory
cd krishik

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_GROQ_API_KEY=your_groq_api_key
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Running Locally
```bash
# Start Web Development Server
npm run web

# Start Expo Development Server for Android / iOS
npx expo start
```

### 5. Production Web Export
```bash
# Export static web build to /dist
npm run build
```

---

## 🔍 SEO & Search Engine Optimization

This project includes complete SEO optimizations for Google Search Engine indexing:
- **Canonical Domain:** `https://www.krishikmitra.site`
- **Sitemap:** `/public/sitemap.xml`
- **Robots Directives:** `/public/robots.txt`
- **Structured Data:** Schema.org `Organization`, `WebApplication`, `FAQPage`, and `BreadcrumbList` JSON-LD tags.

---

## 📄 License & Credits

Distributed under the MIT License. See `LICENSE` for more information.

Designed with ❤️ for Indian Farmers.
