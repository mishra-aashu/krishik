-- ============================================================
-- Krishik App — Initial Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Profiles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text UNIQUE NOT NULL,
  farm_state text NOT NULL DEFAULT 'Punjab',
  farm_soil text NOT NULL DEFAULT 'Alluvial Soil (जलोढ़)',
  farm_crop text NOT NULL DEFAULT 'Wheat (गेहूं)',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ─── Mandi Prices ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mandi_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity text NOT NULL,
  price numeric NOT NULL,
  unit text NOT NULL DEFAULT 'Quintal',
  state text NOT NULL,
  market text NOT NULL,
  change text DEFAULT '0',
  variety text,
  arrival_date text,
  fetched_at timestamptz DEFAULT now(),
  UNIQUE(commodity, market, state, arrival_date)
);

ALTER TABLE mandi_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read mandi prices" ON mandi_prices FOR SELECT USING (true);

-- ─── Communities ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communities (
  id text PRIMARY KEY,
  name_en text NOT NULL,
  name_hi text NOT NULL,
  desc_en text NOT NULL,
  desc_hi text NOT NULL,
  category text NOT NULL CHECK (category IN ('crops','machinery','weather','general')),
  creator_phone text NOT NULL,
  avatar text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read communities"        ON communities FOR SELECT USING (true);
CREATE POLICY "Auth users can create community"    ON communities FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ─── Community Members ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_members (
  community_id text REFERENCES communities(id) ON DELETE CASCADE,
  member_phone text NOT NULL,
  PRIMARY KEY (community_id, member_phone)
);

ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read members"   ON community_members FOR SELECT USING (true);
CREATE POLICY "Auth users can join"       ON community_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users can leave"      ON community_members FOR DELETE  USING (auth.role() = 'authenticated');

-- ─── Posts ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id text PRIMARY KEY,
  community_id text REFERENCES communities(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_phone text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  tag text NOT NULL DEFAULT '#Chowpal',
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  rent_price numeric,
  rent_unit text,
  location text
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read posts"      ON posts FOR SELECT USING (true);
CREATE POLICY "Auth users can create post" ON posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Author can delete own post" ON posts FOR DELETE USING (
  author_phone = (SELECT phone FROM profiles WHERE id = auth.uid())
);

-- ─── Upvotes ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upvotes (
  post_id text REFERENCES posts(id) ON DELETE CASCADE,
  voter_phone text NOT NULL,
  PRIMARY KEY (post_id, voter_phone)
);

ALTER TABLE upvotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read upvotes"       ON upvotes FOR SELECT USING (true);
CREATE POLICY "Auth users can upvote"         ON upvotes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth users can remove upvote"  ON upvotes FOR DELETE  USING (auth.role() = 'authenticated');

-- ─── Comments ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id text PRIMARY KEY,
  post_id text REFERENCES posts(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_phone text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read comments"  ON comments FOR SELECT USING (true);
CREATE POLICY "Auth users can comment"    ON comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ─── Reported Posts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reported_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id text REFERENCES posts(id) ON DELETE CASCADE,
  reported_at timestamptz DEFAULT now()
);

ALTER TABLE reported_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can report" ON reported_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ─── Helper Function: increment comments count ───────────────────────────────
CREATE OR REPLACE FUNCTION increment_comments_count(post_id_arg text)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE posts SET comments_count = comments_count + 1 WHERE id = post_id_arg;
$$;

-- ─── Seed Communities ────────────────────────────────────────────────────────
INSERT INTO communities (id, name_en, name_hi, desc_en, desc_hi, category, creator_phone, avatar, created_at)
VALUES
  ('c1',
   'Tractor & Machinery Rental',
   'ट्रैक्टर और मशीनरी किराया',
   'Rent, share, buy, or sell agricultural tools and machinery like tractors, threshers, harvesters, etc.',
   'ट्रैक्टर, थ्रेशर, हार्वेस्टर आदि कृषि उपकरण किराए पर लें, साझा करें, खरीदें या बेचें।',
   'machinery', 'System', '🚜', now() - interval '10 days'),

  ('c2',
   'Wheat Growers Advance Forum',
   'गेहूं की उन्नत खेती मंच',
   'Expert farming advice, pest control, and fertilizer suggestions specifically for wheat growers.',
   'गेहूं उत्पादकों के लिए विशेष कृषि सलाह, कीट नियंत्रण और उर्वरक सुझाव।',
   'crops', 'System', '🌾', now() - interval '10 days'),

  ('c3',
   'Mausam & Local Advisories',
   'मौसम और स्थानीय सलाह',
   'Discuss local weather patterns, rain forecasts, climate issues, and advisory alerts.',
   'स्थानीय मौसम के पैटर्न, बारिश के पूर्वानुमान, जलवायु समस्याओं और सलाह अलर्ट पर चर्चा करें।',
   'weather', 'System', '☀️', now() - interval '10 days'),

  ('c4',
   'Kisan Chowpal General Chat',
   'किसान चौपाल सामान्य चर्चा',
   'A general chat board for farmers to connect, share daily farming experiences, and ask general questions.',
   'किसानों के लिए आपस में जुड़ने, दैनिक खेती के अनुभव साझा करने और सामान्य प्रश्न पूछने के लिए एक मंच।',
   'general', 'System', '💬', now() - interval '10 days')
ON CONFLICT (id) DO NOTHING;

-- ─── Seed Posts ──────────────────────────────────────────────────────────────
INSERT INTO posts (id, community_id, author_name, author_phone, title, content, image_url, tag, comments_count, created_at, rent_price, rent_unit, location)
VALUES
  ('p1', 'c1',
   'Rajesh Kumar (राजेश कुमार)', '9876543210',
   'Mahindra 575 DI Tractor on Rent (महिंद्रा 575 DI ट्रैक्टर किराए पर उपलब्ध)',
   'Mahindra 575 tractor is available for rent in Ludhiana region. Excellent condition, with driver. Ready for ploughing, tilling, and transport work. Reach out to discuss dates.',
   NULL, '#Rent', 2, now() - interval '2 days', 800, 'hour', 'Ludhiana, Punjab'),

  ('p2', 'c2',
   'Sukhwinder Singh (सुखविंदर सिंह)', '8765432109',
   'Wheat Crop Update - PBW 826 Variety (गेहूं की फसल अपडेट - PBW 826 किस्म)',
   'Very happy with the vegetative growth of the PBW 826 wheat variety this season. Followed the dynamic NPK fertilizer dosages and watered on schedule. Leaves are broad and disease-free.',
   NULL, '#Wheat', 1, now() - interval '1 day', NULL, NULL, NULL),

  ('p3', 'c3',
   'Satnam Singh (सतनाम सिंह)', '7654321098',
   'Heavy rain warning in Punjab next 2 days (पंजाब में अगले 2 दिनों में भारी बारिश की चेतावनी)',
   'IMD has issued a weather warning of moderate to heavy rain in central Punjab districts over the next 48 hours. Farmers are advised to halt harvesting wheat crops and ensure proper drainage channels are clear.',
   NULL, '#Weather', 1, now() - interval '4 hours', NULL, NULL, NULL),

  ('p4', 'c4',
   'Ramesh Meena (रमेश मीणा)', '6543210987',
   'Clayey soil fertilizer query (चिकनी मिट्टी के लिए खाद की मात्रा का सवाल)',
   'I have clayey (चिकनी) soil in Tonk, Rajasthan, planning to sow mustard. What is the recommended urea and single super phosphate (SSP) ratio for clayey soil to avoid water stagnation damage?',
   NULL, '#Soil', 0, now() - interval '10 hours', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ─── Seed Upvotes ────────────────────────────────────────────────────────────
INSERT INTO upvotes (post_id, voter_phone) VALUES
  ('p1', '1111111111'), ('p1', '2222222222'),
  ('p2', '1111111111'), ('p2', '3333333333'), ('p2', '4444444444'),
  ('p3', '2222222222'), ('p3', '4444444444'),
  ('p4', '1111111111')
ON CONFLICT DO NOTHING;

-- ─── Seed Comments ───────────────────────────────────────────────────────────
INSERT INTO comments (id, post_id, author_name, author_phone, content, created_at)
VALUES
  ('m1', 'p1', 'Gurpreet Singh (गुरप्रीत सिंह)', '9988776655',
   'Very reasonable rate. Is it available for next Monday in Jalandhar or only Ludhiana?',
   now() - interval '1 day'),
  ('m2', 'p1', 'Rajesh Kumar (राजेश कुमार)', '9876543210',
   'Yes, if booked for 2 or more days, I can transport it to Jalandhar. Please call.',
   now() - interval '12 hours'),
  ('m3', 'p2', 'Harpal Singh (हरपाल सिंह)', '8877665544',
   'Excellent progress! PBW 826 is indeed showing high resistance to yellow rust this year. Did you use any organic spray?',
   now() - interval '18 hours'),
  ('m4', 'p3', 'Manpreet Sandhu (मनप्रीत संधू)', '7766554433',
   'Thank you for the update, Satnam paaji. Just delayed my harvesting by a week.',
   now() - interval '2 hours')
ON CONFLICT (id) DO NOTHING;
