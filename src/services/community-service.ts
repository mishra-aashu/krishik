import { LocalStorage } from '@/utils/storage';

export interface Community {
  id: string;
  name: { en: string; hi: string };
  description: { en: string; hi: string };
  category: 'crops' | 'machinery' | 'weather' | 'general';
  creator: string;
  members: string[]; // List of user phone numbers
  createdAt: string;
  avatar: string; // Icon identifier or emoji
}

export interface Post {
  id: string;
  communityId: string;
  authorName: string;
  authorPhone: string;
  title: string;
  content: string;
  image: string | null; // Base64 string or asset name (e.g. 'seed_tractor.png')
  tag: string; // e.g. '#Rent', '#Weather', '#Pest'
  upvotes: string[]; // List of user phone numbers who liked it
  commentsCount: number;
  createdAt: string;
  // Optional Rental/Selling info
  rentPrice?: number | null;
  rentUnit?: string | null; // e.g., 'hour', 'day'
  location?: string | null;
}

export interface Comment {
  id: string;
  postId: string;
  authorName: string;
  authorPhone: string;
  content: string;
  createdAt: string;
}

// Predefined seed communities
const SEED_COMMUNITIES: Community[] = [
  {
    id: 'c1',
    name: { en: 'Tractor & Machinery Rental', hi: 'ट्रैक्टर और मशीनरी किराया' },
    description: {
      en: 'Rent, share, buy, or sell agricultural tools and machinery like tractors, threshers, harvesters, etc.',
      hi: 'ट्रैक्टर, थ्रेशर, हार्वेस्टर आदि कृषि उपकरण किराए पर लें, साझा करें, खरीदें या बेचें।'
    },
    category: 'machinery',
    creator: 'System',
    members: ['1111111111', '2222222222', '3333333333'],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    avatar: '🚜'
  },
  {
    id: 'c2',
    name: { en: 'Wheat Growers Advance Forum', hi: 'गेहूं की उन्नत खेती मंच' },
    description: {
      en: 'Expert farming advice, pest control, and fertilizer suggestions specifically for wheat growers.',
      hi: 'गेहूं उत्पादकों के लिए विशेष कृषि सलाह, कीट नियंत्रण और उर्वरक सुझाव।'
    },
    category: 'crops',
    creator: 'System',
    members: ['1111111111', '4444444444'],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    avatar: '🌾'
  },
  {
    id: 'c3',
    name: { en: 'Mausam & Local Advisories', hi: 'मौसम और स्थानीय सलाह' },
    description: {
      en: 'Discuss local weather patterns, rain forecasts, climate issues, and advisory alerts.',
      hi: 'स्थानीय मौसम के पैटर्न, बारिश के पूर्वानुमान, जलवायु समस्याओं और सलाह अलर्ट पर चर्चा करें।'
    },
    category: 'weather',
    creator: 'System',
    members: ['2222222222', '3333333333', '4444444444'],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    avatar: '☀️'
  },
  {
    id: 'c4',
    name: { en: 'Kisan Chowpal General Chat', hi: 'किसान चौपाल सामान्य चर्चा' },
    description: {
      en: 'A general chat board for farmers to connect, share daily farming experiences, and ask general questions.',
      hi: 'किसानों के लिए आपस में जुड़ने, दैनिक खेती के अनुभव साझा करने और सामान्य प्रश्न पूछने के लिए एक मंच।'
    },
    category: 'general',
    creator: 'System',
    members: [],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    avatar: '💬'
  }
];

// Predefined seed posts
const SEED_POSTS: Post[] = [
  {
    id: 'p1',
    communityId: 'c1',
    authorName: 'Rajesh Kumar (राजेश कुमार)',
    authorPhone: '9876543210',
    title: 'Mahindra 575 DI Tractor on Rent (महिंद्रा 575 DI ट्रैक्टर किराए पर उपलब्ध)',
    content: 'Mahindra 575 tractor is available for rent in Ludhiana region. Excellent condition, with driver. Ready for ploughing, tilling, and transport work. Reach out to discuss dates.',
    image: 'seed_tractor.png',
    tag: '#Rent',
    upvotes: ['1111111111', '2222222222'],
    commentsCount: 2,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    rentPrice: 800,
    rentUnit: 'hour',
    location: 'Ludhiana, Punjab'
  },
  {
    id: 'p2',
    communityId: 'c2',
    authorName: 'Sukhwinder Singh (सुखविंदर सिंह)',
    authorPhone: '8765432109',
    title: 'Wheat Crop Update - PBW 826 Variety (गेहूं की फसल अपडेट - PBW 826 किस्म)',
    content: 'Very happy with the vegetative growth of the PBW 826 wheat variety this season. Followed the dynamic NPK fertilizer dosages and watered on schedule. Leaves are broad and disease-free. Sharing a photo from this morning!',
    image: 'seed_wheat.png',
    tag: '#Wheat',
    upvotes: ['1111111111', '3333333333', '4444444444'],
    commentsCount: 1,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'p3',
    communityId: 'c3',
    authorName: 'Satnam Singh (सतनाम सिंह)',
    authorPhone: '7654321098',
    title: 'Heavy rain warning in Punjab next 2 days (पंजाब में अगले 2 दिनों में भारी बारिश की चेतावनी)',
    content: 'IMD has issued a weather warning of moderate to heavy rain in central Punjab districts over the next 48 hours. Farmers are advised to halt harvesting wheat crops and ensure proper drainage channels are clear in fields.',
    image: null,
    tag: '#Weather',
    upvotes: ['2222222222', '4444444444'],
    commentsCount: 1,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'p4',
    communityId: 'c4',
    authorName: 'Ramesh Meena (रमेश मीणा)',
    authorPhone: '6543210987',
    title: 'Clayey soil fertilizer query (चिकनी मिट्टी के लिए खाद की मात्रा का सवाल)',
    content: 'I have clayey (चिकनी) soil in Tonk, Rajasthan, planning to sow mustard. What is the recommended urea and single super phosphate (SSP) ratio for clayey soil to avoid water stagnation damage?',
    image: null,
    tag: '#Soil',
    upvotes: ['1111111111'],
    commentsCount: 0,
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString()
  }
];

// Predefined seed comments
const SEED_COMMENTS: Comment[] = [
  {
    id: 'm1',
    postId: 'p1',
    authorName: 'Gurpreet Singh (गुरप्रीत सिंह)',
    authorPhone: '9988776655',
    content: 'Very reasonable rate. Is it available for next Monday in Jalandhar or only Ludhiana?',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'm2',
    postId: 'p1',
    authorName: 'Rajesh Kumar (राजेश कुमार)',
    authorPhone: '9876543210',
    content: 'Yes, if booked for 2 or more days, I can transport it to Jalandhar. Please call.',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'm3',
    postId: 'p2',
    authorName: 'Harpal Singh (हरपाल सिंह)',
    authorPhone: '8877665544',
    content: 'Excellent progress! PBW 826 is indeed showing high resistance to yellow rust this year. Did you use any organic spray?',
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'm4',
    postId: 'p3',
    authorName: 'Manpreet Sandhu (मनप्रीत संधू)',
    authorPhone: '7766554433',
    content: 'Thank you for the update, Satnam paaji. Just delayed my harvesting by a week.',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  }
];

// Helper to load items
async function loadStorageData<T>(key: string, seed: T[]): Promise<T[]> {
  try {
    const raw = await LocalStorage.getItem(key);
    if (!raw) {
      await LocalStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error loading community data for key ${key}:`, e);
    return seed;
  }
}

// Helper to save items
async function saveStorageData<T>(key: string, data: T[]): Promise<void> {
  try {
    await LocalStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving community data for key ${key}:`, e);
  }
}

export const CommunityService = {
  // Communities CRUD
  async getCommunities(): Promise<Community[]> {
    return loadStorageData<Community>('chowpal_communities', SEED_COMMUNITIES);
  },

  async createCommunity(
    nameEn: string,
    nameHi: string,
    descEn: string,
    descHi: string,
    category: 'crops' | 'machinery' | 'weather' | 'general',
    avatar: string,
    creatorName: string,
    creatorPhone: string
  ): Promise<Community> {
    const communities = await this.getCommunities();
    const newCommunity: Community = {
      id: `c_${Math.random().toString(36).substring(7)}`,
      name: { en: nameEn, hi: nameHi },
      description: { en: descEn, hi: descHi },
      category,
      creator: creatorName,
      members: [creatorPhone], // creator automatically joins
      createdAt: new Date().toISOString(),
      avatar: avatar || '🌱'
    };
    communities.push(newCommunity);
    await saveStorageData('chowpal_communities', communities);
    return newCommunity;
  },

  async joinCommunity(communityId: string, phone: string): Promise<boolean> {
    const communities = await this.getCommunities();
    let joined = false;
    const updated = communities.map((c) => {
      if (c.id === communityId) {
        let members = [...c.members];
        if (members.includes(phone)) {
          members = members.filter((p) => p !== phone);
          joined = false;
        } else {
          members.push(phone);
          joined = true;
        }
        return { ...c, members };
      }
      return c;
    });
    await saveStorageData('chowpal_communities', updated);
    return joined;
  },

  // Posts CRUD
  async getPosts(communityId?: string, phone?: string): Promise<Post[]> {
    const posts = await loadStorageData<Post>('chowpal_posts', SEED_POSTS);
    const reported = await loadStorageData<string>('chowpal_reported_posts', []);

    // Filter out reported posts
    let filteredPosts = posts.filter(p => !reported.includes(p.id));

    if (communityId) {
      filteredPosts = filteredPosts.filter((p) => p.communityId === communityId);
    }

    // Sort by newest first
    return filteredPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createPost(
    communityId: string,
    authorName: string,
    authorPhone: string,
    title: string,
    content: string,
    tag: string,
    image: string | null,
    rentPrice: number | null = null,
    rentUnit: string | null = null,
    location: string | null = null
  ): Promise<Post> {
    const posts = await loadStorageData<Post>('chowpal_posts', SEED_POSTS);
    const newPost: Post = {
      id: `p_${Math.random().toString(36).substring(7)}`,
      communityId,
      authorName,
      authorPhone,
      title,
      content,
      image,
      tag: tag || '#Chowpal',
      upvotes: [],
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      rentPrice,
      rentUnit,
      location
    };
    posts.push(newPost);
    await saveStorageData('chowpal_posts', posts);
    return newPost;
  },

  async toggleUpvotePost(postId: string, phone: string): Promise<boolean> {
    const posts = await loadStorageData<Post>('chowpal_posts', SEED_POSTS);
    let liked = false;
    const updated = posts.map((p) => {
      if (p.id === postId) {
        let upvotes = [...p.upvotes];
        if (upvotes.includes(phone)) {
          upvotes = upvotes.filter((ph) => ph !== phone);
          liked = false;
        } else {
          upvotes.push(phone);
          liked = true;
        }
        return { ...p, upvotes };
      }
      return p;
    });
    await saveStorageData('chowpal_posts', updated);
    return liked;
  },

  // Comments CRUD
  async getComments(postId: string): Promise<Comment[]> {
    const comments = await loadStorageData<Comment>('chowpal_comments', SEED_COMMENTS);
    return comments
      .filter((c) => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async createComment(
    postId: string,
    authorName: string,
    authorPhone: string,
    content: string
  ): Promise<Comment> {
    // 1. Add Comment
    const comments = await loadStorageData<Comment>('chowpal_comments', SEED_COMMENTS);
    const newComment: Comment = {
      id: `m_${Math.random().toString(36).substring(7)}`,
      postId,
      authorName,
      authorPhone,
      content,
      createdAt: new Date().toISOString()
    };
    comments.push(newComment);
    await saveStorageData('chowpal_comments', comments);

    // 2. Update post commentsCount
    const posts = await loadStorageData<Post>('chowpal_posts', SEED_POSTS);
    const updatedPosts = posts.map((p) => {
      if (p.id === postId) {
        return { ...p, commentsCount: p.commentsCount + 1 };
      }
      return p;
    });
    await saveStorageData('chowpal_posts', updatedPosts);

    return newComment;
  },

  // Moderation
  async reportPost(postId: string): Promise<void> {
    const reported = await loadStorageData<string>('chowpal_reported_posts', []);
    if (!reported.includes(postId)) {
      reported.push(postId);
      await saveStorageData('chowpal_reported_posts', reported);
    }
  },

  async deletePost(postId: string, phone: string): Promise<boolean> {
    const posts = await loadStorageData<Post>('chowpal_posts', SEED_POSTS);
    const postToDelete = posts.find(p => p.id === postId);
    if (!postToDelete || postToDelete.authorPhone !== phone) {
      return false; // Not authorized
    }
    const filtered = posts.filter(p => p.id !== postId);
    await saveStorageData('chowpal_posts', filtered);

    // Delete associated comments
    const comments = await loadStorageData<Comment>('chowpal_comments', SEED_COMMENTS);
    const filteredComments = comments.filter(c => c.postId !== postId);
    await saveStorageData('chowpal_comments', filteredComments);

    return true;
  }
};
