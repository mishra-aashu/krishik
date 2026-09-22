import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Community {
  id: string;
  name: { en: string; hi: string };
  description: { en: string; hi: string };
  category: 'crops' | 'machinery' | 'weather' | 'general';
  creator: string;
  members: string[]; // list of member_phone values
  createdAt: string;
  avatar: string;
}

export interface Post {
  id: string;
  communityId: string;
  authorName: string;
  authorPhone: string;
  title: string;
  content: string;
  image: string | null;
  tag: string;
  upvotes: string[]; // list of voter_phone values
  commentsCount: number;
  createdAt: string;
  rentPrice?: number | null;
  rentUnit?: string | null;
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

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapCommunity(row: any, members: any[]): Community {
  const memberPhones = members
    .filter((m: any) => m.community_id === row.id)
    .map((m: any) => m.member_phone);
  return {
    id: row.id,
    name: { en: row.name_en, hi: row.name_hi },
    description: { en: row.desc_en, hi: row.desc_hi },
    category: row.category,
    creator: row.creator_phone,
    members: memberPhones,
    createdAt: row.created_at,
    avatar: row.avatar,
  };
}

function mapPost(row: any, upvotes: any[]): Post {
  const voterPhones = upvotes
    .filter((u: any) => u.post_id === row.id)
    .map((u: any) => u.voter_phone);
  return {
    id: row.id,
    communityId: row.community_id,
    authorName: row.author_name,
    authorPhone: row.author_phone,
    title: row.title,
    content: row.content,
    image: row.image_url ?? null,
    tag: row.tag,
    upvotes: voterPhones,
    commentsCount: row.comments_count,
    createdAt: row.created_at,
    rentPrice: row.rent_price ?? null,
    rentUnit: row.rent_unit ?? null,
    location: row.location ?? null,
  };
}

function mapComment(row: any): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    authorName: row.author_name,
    authorPhone: row.author_phone,
    content: row.content,
    createdAt: row.created_at,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export const CommunityService = {
  // ── Communities ─────────────────────────────────────────────────────────────
  async getCommunities(): Promise<Community[]> {
    const { data: communities, error } = await supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !communities) {
      console.error('getCommunities error:', error?.message);
      return [];
    }

    const { data: members } = await supabase
      .from('community_members')
      .select('community_id, member_phone');

    return communities.map((c) => mapCommunity(c, members || []));
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
    const id = `c_${Math.random().toString(36).substring(7)}`;
    const newRow = {
      id,
      name_en: nameEn,
      name_hi: nameHi,
      desc_en: descEn,
      desc_hi: descHi,
      category,
      creator_phone: creatorPhone,
      avatar: avatar || 'leaf',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('communities')
      .insert(newRow)
      .select()
      .single();

    if (error || !data) throw new Error('Failed to create community: ' + error?.message);

    // Auto-join creator
    await supabase
      .from('community_members')
      .insert({ community_id: id, member_phone: creatorPhone });

    return mapCommunity(data, [{ community_id: id, member_phone: creatorPhone }]);
  },

  async joinCommunity(communityId: string, phone: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('community_members')
      .select('member_phone')
      .eq('community_id', communityId)
      .eq('member_phone', phone)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('member_phone', phone);
      return false; // left
    } else {
      await supabase
        .from('community_members')
        .insert({ community_id: communityId, member_phone: phone });
      return true; // joined
    }
  },

  // ── Posts ────────────────────────────────────────────────────────────────────
  async getPosts(communityId?: string, phone?: string): Promise<Post[]> {
    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (communityId) {
      query = query.eq('community_id', communityId);
    }

    const { data: posts, error } = await query;
    if (error || !posts) {
      console.error('getPosts error:', error?.message);
      return [];
    }

    // Filter out reported posts
    const { data: reported } = await supabase
      .from('reported_posts')
      .select('post_id');
    const reportedIds = new Set((reported || []).map((r: any) => r.post_id));
    const visible = posts.filter((p) => !reportedIds.has(p.id));

    // Fetch upvotes for visible posts
    const postIds = visible.map((p) => p.id);
    const { data: upvotes } = postIds.length > 0
      ? await supabase
          .from('upvotes')
          .select('post_id, voter_phone')
          .in('post_id', postIds)
      : { data: [] };

    return visible.map((p) => mapPost(p, upvotes || []));
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
    const id = `p_${Math.random().toString(36).substring(7)}`;
    const newRow = {
      id,
      community_id: communityId,
      author_name: authorName,
      author_phone: authorPhone,
      title,
      content,
      image_url: image,
      tag: tag || '#Chowpal',
      comments_count: 0,
      created_at: new Date().toISOString(),
      rent_price: rentPrice,
      rent_unit: rentUnit,
      location,
    };

    const { data, error } = await supabase
      .from('posts')
      .insert(newRow)
      .select()
      .single();

    if (error || !data) throw new Error('Failed to create post: ' + error?.message);
    return mapPost(data, []);
  },

  async toggleUpvotePost(postId: string, phone: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('upvotes')
      .select('voter_phone')
      .eq('post_id', postId)
      .eq('voter_phone', phone)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('upvotes')
        .delete()
        .eq('post_id', postId)
        .eq('voter_phone', phone);
      return false; // unliked
    } else {
      await supabase
        .from('upvotes')
        .insert({ post_id: postId, voter_phone: phone });
      return true; // liked
    }
  },

  // ── Comments ─────────────────────────────────────────────────────────────────
  async getComments(postId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      console.error('getComments error:', error?.message);
      return [];
    }
    return data.map(mapComment);
  },

  async createComment(
    postId: string,
    authorName: string,
    authorPhone: string,
    content: string
  ): Promise<Comment> {
    const id = `m_${Math.random().toString(36).substring(7)}`;
    const newRow = {
      id,
      post_id: postId,
      author_name: authorName,
      author_phone: authorPhone,
      content,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('comments')
      .insert(newRow)
      .select()
      .single();

    if (error || !data) throw new Error('Failed to create comment: ' + error?.message);

    // Increment comments_count on parent post via RPC
    await supabase.rpc('increment_comments_count', { post_id_arg: postId });

    return mapComment(data);
  },

  // ── Moderation ────────────────────────────────────────────────────────────────
  async reportPost(postId: string): Promise<void> {
    const { error } = await supabase
      .from('reported_posts')
      .insert({ post_id: postId });
    if (error) console.error('reportPost error:', error.message);
  },

  async deletePost(postId: string, phone: string): Promise<boolean> {
    // Verify ownership before deleting
    const { data: post } = await supabase
      .from('posts')
      .select('author_phone')
      .eq('id', postId)
      .single();

    if (!post || post.author_phone !== phone) return false;

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('deletePost error:', error.message);
      return false;
    }
    return true;
  },
};
