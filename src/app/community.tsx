import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  View,
  Modal,
  FlatList,
  Platform,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Image as RNImage
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SymbolView } from 'expo-symbols';
import { Colors, Spacing, BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/auth-context';
import { LocalStorage } from '@/utils/storage';
import { CommunityService, type Community, type Post, type Comment } from '@/services/community-service';

// Custom helper to resolve static assets for seeded posts or fallback to URI
const getPostImage = (imagePath: string | null) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('data:image')) return { uri: imagePath };
  if (imagePath === 'seed_tractor.png') return require('../../assets/images/seed_tractor.png');
  if (imagePath === 'seed_wheat.png') return require('../../assets/images/seed_wheat.png');
  return { uri: imagePath };
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'crops':
      return { ios: 'leaf.fill', android: 'spa', web: 'spa' };
    case 'machinery':
      return { ios: 'gear', android: 'agriculture', web: 'agriculture' };
    case 'weather':
      return { ios: 'sun.max.fill', android: 'wb_sunny', web: 'wb_sunny' };
    case 'general':
    default:
      return { ios: 'bubble.left.and.bubble.right.fill', android: 'forum', web: 'forum' };
  }
};

const getLocalizedTag = (tag: string, lang: 'hi' | 'en') => {
  if (lang === 'en') return tag;
  switch (tag) {
    case '#Rent': return '#किराया';
    case '#Buy': return '#खरीदें';
    case '#Sell': return '#बेचें';
    case '#General': return '#सामान्य';
    case '#Question': return '#सवाल';
    case '#Wheat': return '#गेहूं';
    case '#Pest': return '#कीट';
    case '#Advice': return '#सलाह';
    case '#Weather': return '#मौसम';
    case '#Rain': return '#बारिश';
    case '#Frost': return '#पाले_का_असर';
    case '#Alert': return '#चेतावनी';
    case '#Discussion': return '#चर्चा';
    default: return tag;
  }
};

const getLocalizedText = (text: string | null | undefined, lang: 'hi' | 'en') => {
  if (!text) return '';
  const match = text.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    const [_, enText, hiText] = match;
    return lang === 'hi' ? hiText.trim() : enText.trim();
  }
  return text;
};

export default function CommunityScreen() {
  const router = useRouter();
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { userName, userPhone } = useAuth();

  // Language state
  const [language, setLanguage] = useState<'hi' | 'en'>('hi');

  // Load language preference
  useFocusEffect(
    React.useCallback(() => {
      const loadLanguage = async () => {
        const savedLang = await LocalStorage.getItem('chat_lang');
        if (savedLang === 'hi' || savedLang === 'en') {
          setLanguage(savedLang);
        }
      };
      loadLanguage();
    }, [])
  );

  const toggleLanguage = async () => {
    const nextLang = language === 'hi' ? 'en' : 'hi';
    setLanguage(nextLang);
    await LocalStorage.setItem('chat_lang', nextLang);
  };

  // Navigations & Views
  // 'main' = Community lists & generic feed tabs
  // 'community-details' = Subpage of a selected community
  // 'post-details' = Details of a selected post
  const [activeView, setActiveView] = useState<'main' | 'community-details' | 'post-details'>('main');
  const [activeTab, setActiveTab] = useState<'communities' | 'my-feed' | 'trending'>('communities');
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Filter category for community list ('all', 'crops', 'machinery', 'weather', 'general')
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Core Data Lists
  const [communities, setCommunities] = useState<Community[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals Visibility
  const [createCommunityVisible, setCreateCommunityVisible] = useState(false);
  const [createPostVisible, setCreatePostVisible] = useState(false);

  // Create Community Form States
  const [commName, setCommName] = useState('');
  const [commDesc, setCommDesc] = useState('');
  const [commCategory, setCommCategory] = useState<'crops' | 'machinery' | 'weather' | 'general'>('general');
  const [commAvatar, setCommAvatar] = useState('general');

  // Create Post Form States
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState<string | null>(null);
  const [postTag, setPostTag] = useState('#General');
  const [postRentPrice, setPostRentPrice] = useState('');
  const [postRentUnit, setPostRentUnit] = useState<'hour' | 'day'>('hour');
  const [postLocation, setPostLocation] = useState('');

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  // Initial Data Fetch
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const commList = await CommunityService.getCommunities();
      setCommunities(commList);

      if (activeView === 'main') {
        const postList = await CommunityService.getPosts();
        setPosts(postList);
      } else if (activeView === 'community-details' && selectedCommunity) {
        // Refresh selected community details (e.g. member list)
        const freshComm = commList.find(c => c.id === selectedCommunity.id);
        if (freshComm) setSelectedCommunity(freshComm);
        
        const postList = await CommunityService.getPosts(selectedCommunity.id);
        setPosts(postList);
      }
    } catch (err) {
      console.error('Error fetching Chowpal data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeView, selectedCommunity?.id]);

  // Fetch comments when a post is selected
  useEffect(() => {
    if (selectedPost) {
      CommunityService.getComments(selectedPost.id).then(setComments);
    }
  }, [selectedPost]);

  const handleJoinLeave = async (communityId: string) => {
    try {
      const isJoined = await CommunityService.joinCommunity(communityId, userPhone || 'demo');
      // Update local state
      setCommunities(prev =>
        prev.map(c => {
          if (c.id === communityId) {
            const members = isJoined
              ? [...c.members, userPhone || 'demo']
              : c.members.filter(m => m !== (userPhone || 'demo'));
            return { ...c, members };
          }
          return c;
        })
      );
      // If inside community details, update selected community state
      if (selectedCommunity && selectedCommunity.id === communityId) {
        setSelectedCommunity(prev => {
          if (!prev) return null;
          const members = isJoined
            ? [...prev.members, userPhone || 'demo']
            : prev.members.filter(m => m !== (userPhone || 'demo'));
          return { ...prev, members };
        });
      }
      
      Alert.alert(
        language === 'hi' ? 'अपडेट' : 'Success',
        isJoined 
          ? (language === 'hi' ? 'आप चौपाल में शामिल हो गए हैं!' : 'Joined community successfully!')
          : (language === 'hi' ? 'आप चौपाल से बाहर हो गए हैं।' : 'Left community successfully.')
      );
    } catch (err) {
      console.error('Error joining/leaving community:', err);
    }
  };

  // Upvote Post
  const handleUpvote = async (postId: string) => {
    try {
      const isLiked = await CommunityService.toggleUpvotePost(postId, userPhone || 'demo');
      
      // Update posts list
      setPosts(prev =>
        prev.map(p => {
          if (p.id === postId) {
            const upvotes = isLiked
              ? [...p.upvotes, userPhone || 'demo']
              : p.upvotes.filter(u => u !== (userPhone || 'demo'));
            return { ...p, upvotes };
          }
          return p;
        })
      );

      // If active in details
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(prev => {
          if (!prev) return null;
          const upvotes = isLiked
            ? [...prev.upvotes, userPhone || 'demo']
            : prev.upvotes.filter(u => u !== (userPhone || 'demo'));
          return { ...prev, upvotes };
        });
      }
    } catch (err) {
      console.error('Error toggling upvote:', err);
    }
  };

  // Submit Community
  const handleSubmitCommunity = async () => {
    if (!commName.trim() || !commDesc.trim()) {
      Alert.alert(
        language === 'hi' ? 'त्रुटि' : 'Error',
        language === 'hi' ? 'कृपया सभी विवरण भरें।' : 'Please fill in all details.'
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const newComm = await CommunityService.createCommunity(
        commName.trim(),
        commName.trim(),
        commDesc.trim(),
        commDesc.trim(),
        commCategory,
        commAvatar,
        userName || 'Kisan',
        userPhone || 'demo'
      );
      setCommunities(prev => [newComm, ...prev]);
      setCreateCommunityVisible(false);
      // Reset form
      setCommName('');
      setCommDesc('');
      setCommCategory('general');
      setCommAvatar('general');
      
      Alert.alert(
        language === 'hi' ? 'सफल' : 'Success',
        language === 'hi' ? 'नई चौपाल सफलतापूर्वक बनाई गई!' : 'New Chowpal created successfully!'
      );
    } catch (err) {
      console.error('Error creating community:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Select photo for new post
  const pickPostImage = async (useCamera: boolean) => {
    try {
      if (Platform.OS !== 'web') {
        const permissionResult = useCamera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.status !== 'granted') {
          Alert.alert(
            language === 'hi' ? 'अनुमति आवश्यक' : 'Permission Required',
            language === 'hi'
              ? (useCamera ? 'कैमरा उपयोग करने की अनुमति दें।' : 'गैलरी उपयोग करने की अनुमति दें।')
              : (useCamera ? 'Camera permission is required.' : 'Media library permission is required.')
          );
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Str = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setPostImage(base64Str);
      }
    } catch (err) {
      console.error('Error picking post image:', err);
    }
  };

  // Submit Post
  const handleSubmitPost = async () => {
    if (!selectedCommunity) return;
    if (!postTitle || !postContent) {
      Alert.alert(
        language === 'hi' ? 'त्रुटि' : 'Error',
        language === 'hi' ? 'शीर्षक और विवरण आवश्यक हैं।' : 'Title and details are required.'
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const price = postRentPrice ? parseFloat(postRentPrice) : null;
      const freshPost = await CommunityService.createPost(
        selectedCommunity.id,
        userName || 'Kisan',
        userPhone || 'demo',
        postTitle,
        postContent,
        postTag,
        postImage,
        price,
        price ? postRentUnit : null,
        postLocation || null
      );
      
      setPosts(prev => [freshPost, ...prev]);
      setCreatePostVisible(false);
      // Reset form
      setPostTitle('');
      setPostContent('');
      setPostImage(null);
      setPostTag(selectedCommunity.category === 'machinery' ? '#Rent' : '#General');
      setPostRentPrice('');
      setPostRentUnit('hour');
      setPostLocation('');

      Alert.alert(
        language === 'hi' ? 'सफल' : 'Success',
        language === 'hi' ? 'आपकी पोस्ट सफलतापूर्वक साझा की गई!' : 'Post shared successfully!'
      );
    } catch (err) {
      console.error('Error sharing post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Comment
  const handleSubmitComment = async () => {
    if (!selectedPost || !newCommentText.trim()) return;
    try {
      const newComment = await CommunityService.createComment(
        selectedPost.id,
        userName || 'Kisan',
        userPhone || 'demo',
        newCommentText.trim()
      );
      setComments(prev => [...prev, newComment]);
      setNewCommentText('');
      
      // Update comments count in lists
      setPosts(prev =>
        prev.map(p => (p.id === selectedPost.id ? { ...p, commentsCount: p.commentsCount + 1 } : p))
      );
      setSelectedPost(prev => (prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null));
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };

  // Delete Post
  const handleDeletePost = (postId: string) => {
    Alert.alert(
      language === 'hi' ? 'पुष्टि करें' : 'Confirm Delete',
      language === 'hi' ? 'क्या आप इस पोस्ट को डिलीट करना चाहते हैं?' : 'Are you sure you want to delete this post?',
      [
        { text: language === 'hi' ? 'नहीं' : 'Cancel', style: 'cancel' },
        {
          text: language === 'hi' ? 'हाँ' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await CommunityService.deletePost(postId, userPhone || 'demo');
              if (success) {
                setPosts(prev => prev.filter(p => p.id !== postId));
                if (selectedPost && selectedPost.id === postId) {
                  setActiveView('community-details');
                  setSelectedPost(null);
                }
                Alert.alert(
                  language === 'hi' ? 'सफल' : 'Success',
                  language === 'hi' ? 'पोस्ट डिलीट कर दी गई।' : 'Post deleted successfully.'
                );
              }
            } catch (err) {
              console.error('Error deleting post:', err);
            }
          }
        }
      ]
    );
  };

  // Report Post
  const handleReportPost = (postId: string) => {
    Alert.alert(
      language === 'hi' ? 'रिपोर्ट करें' : 'Report Post',
      language === 'hi' ? 'क्या आप इस पोस्ट को अनुपयुक्त मानकर रिपोर्ट करना चाहते हैं?' : 'Do you want to report this post as inappropriate?',
      [
        { text: language === 'hi' ? 'नहीं' : 'Cancel', style: 'cancel' },
        {
          text: language === 'hi' ? 'हाँ, रिपोर्ट करें' : 'Yes, Report',
          onPress: async () => {
            try {
              await CommunityService.reportPost(postId);
              // Hide from local lists
              setPosts(prev => prev.filter(p => p.id !== postId));
              if (selectedPost && selectedPost.id === postId) {
                setActiveView('main');
                setSelectedPost(null);
              }
              Alert.alert(
                language === 'hi' ? 'धन्यवाद' : 'Thank You',
                language === 'hi' ? 'इस पोस्ट को रिपोर्ट किया गया है और आपकी फ़ीड से छिपा दिया गया है।' : 'Post reported and hidden from your feed.'
              );
            } catch (err) {
              console.error('Error reporting post:', err);
            }
          }
        }
      ]
    );
  };

  // Filtered lists
  const filteredCommunities = React.useMemo(() => {
    let list = communities;
    if (categoryFilter !== 'all') {
      list = list.filter(c => c.category === categoryFilter);
    }
    if (searchQuery) {
      list = list.filter(
        c =>
          c.name.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.name.hi.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return list;
  }, [communities, categoryFilter, searchQuery]);

  // consolidated feeds based on active tabs
  const feedPosts = React.useMemo(() => {
    let list = posts;

    // Filter by search query on posts
    if (searchQuery && activeTab !== 'communities') {
      list = list.filter(
        p =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (activeTab === 'my-feed') {
      // Show posts from communities the user joined
      const joinedCommIds = communities
        .filter(c => c.members.includes(userPhone || 'demo'))
        .map(c => c.id);
      return list.filter(p => joinedCommIds.includes(p.communityId));
    }

    if (activeTab === 'trending') {
      // Sort by upvotes count
      return [...list].sort((a, b) => b.upvotes.length - a.upvotes.length);
    }

    return list;
  }, [posts, activeTab, communities, userPhone, searchQuery]);

  const bottomInset = safeAreaInsets.bottom + BottomTabInset + Spacing.three;
  const contentPlatformStyle = Platform.select({
    android: { paddingBottom: bottomInset },
    ios: { paddingBottom: bottomInset },
    web: { paddingBottom: Spacing.four }
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* VIEW 1: MAIN BOARD SECTION */}
        {activeView === 'main' && (
          <>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <ThemedText type="smallBold" style={styles.headerTitle}>
                  {language === 'hi' ? 'किसान चौपाल' : 'Farmers Chowpal'}
                </ThemedText>
                <ThemedText type="small" style={[styles.headerSub, { color: theme.textSecondary, fontWeight: '600' }]}>
                  {language === 'hi' ? 'आपसी चर्चा और साझेदारी मंच' : 'Peer-to-Peer Sharing & Forums'}
                </ThemedText>
              </View>

              <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                <Pressable
                  onPress={toggleLanguage}
                  style={({ pressed }) => [
                    styles.headerActionBtn,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                    pressed && { opacity: 0.8 }
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'globe', android: 'language', web: 'language' } as any}
                    size={14}
                    tintColor={theme.primary}
                  />
                  <ThemedText style={{ color: theme.text, fontSize: 11, fontWeight: '700' }}>
                    {language === 'hi' ? 'Hindi' : 'English'}
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => setCreateCommunityVisible(true)}
                  style={({ pressed }) => [
                    styles.headerActionBtn,
                    { backgroundColor: theme.primary, borderColor: theme.border },
                    pressed && { opacity: 0.9 }
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' } as any}
                    size={14}
                    tintColor={theme.onPrimary}
                  />
                  <ThemedText style={{ color: theme.onPrimary, fontSize: 11, fontWeight: '700' }}>
                    {language === 'hi' ? 'नई चौपाल' : 'New Board'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Tab selection bar: Chowpal Directories vs Consolidated Feed */}
            <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
              <Pressable
                onPress={() => { setActiveTab('communities'); setSearchQuery(''); }}
                style={[
                  styles.tabButton,
                  activeTab === 'communities' && { borderBottomColor: theme.primary }
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={{
                    color: activeTab === 'communities' ? theme.primary : theme.textSecondary,
                    fontSize: 14
                  }}
                >
                  {language === 'hi' ? 'चौपाल सूची' : 'Chowpal Boards'}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => { setActiveTab('my-feed'); setSearchQuery(''); }}
                style={[
                  styles.tabButton,
                  activeTab === 'my-feed' && { borderBottomColor: theme.primary }
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={{
                    color: activeTab === 'my-feed' ? theme.primary : theme.textSecondary,
                    fontSize: 14
                  }}
                >
                  {language === 'hi' ? 'मेरी फ़ीड' : 'My Feed'}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => { setActiveTab('trending'); setSearchQuery(''); }}
                style={[
                  styles.tabButton,
                  activeTab === 'trending' && { borderBottomColor: theme.primary }
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={{
                    color: activeTab === 'trending' ? theme.primary : theme.textSecondary,
                    fontSize: 14
                  }}
                >
                  {language === 'hi' ? 'चर्चित (Trending)' : 'Trending'}
                </ThemedText>
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <TextInput
                style={[
                  styles.searchInput,
                  { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }
                ]}
                placeholder={
                  activeTab === 'communities'
                    ? (language === 'hi' ? 'विषय या चौपाल खोजें...' : 'Search boards...')
                    : (language === 'hi' ? 'पोस्ट का विषय, हैशटैग खोजें...' : 'Search posts, #tags...')
                }
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Sub-Filters for Communities Directory */}
            {activeTab === 'communities' && (
              <View style={styles.categoryFiltersWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilters}>
                  {[
                    { key: 'all', en: 'All', hi: 'सभी' },
                    { key: 'crops', en: 'Crops', hi: 'फसलें (Crops)' },
                    { key: 'machinery', en: 'Machinery', hi: 'मशीनरी (Machinery)' },
                    { key: 'weather', en: 'Weather', hi: 'मौसम (Weather)' },
                    { key: 'general', en: 'General Chat', hi: 'सामान्य (General)' }
                  ].map(cat => {
                    const isSelected = categoryFilter === cat.key;
                    return (
                      <Pressable
                        key={cat.key}
                        onPress={() => setCategoryFilter(cat.key)}
                        style={({ pressed }) => [
                          styles.filterPill,
                          {
                            borderColor: isSelected ? theme.primary : theme.border,
                            backgroundColor: isSelected ? theme.backgroundSelected : theme.backgroundElement,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6
                          },
                          pressed && { opacity: 0.8 }
                        ]}
                      >
                        {cat.key !== 'all' && (
                          <SymbolView
                            name={getCategoryIcon(cat.key) as any}
                            size={12}
                            tintColor={isSelected ? theme.primary : theme.textSecondary}
                          />
                        )}
                        <ThemedText
                          type="code"
                          style={{
                            color: isSelected ? theme.primary : theme.text,
                            fontWeight: isSelected ? '700' : '500'
                          }}
                        >
                          {language === 'hi' ? cat.hi : cat.en}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Content Body */}
            {isLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : activeTab === 'communities' ? (
              // 1. Communities directory
              <FlatList
                data={filteredCommunities}
                keyExtractor={item => item.id}
                contentContainerStyle={[styles.scrollContent, contentPlatformStyle]}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isJoined = item.members.includes(userPhone || 'demo');
                  return (
                    <Pressable
                      onPress={() => {
                        setSelectedCommunity(item);
                        setActiveView('community-details');
                      }}
                      style={({ pressed }) => [
                        styles.boardCard,
                        { backgroundColor: theme.card, borderColor: theme.border },
                        pressed && { opacity: 0.9 }
                      ]}
                    >
                      <View style={styles.boardCardLeft}>
                        <View style={styles.boardEmojiBg}>
                          <SymbolView
                            name={getCategoryIcon(item.category) as any}
                            size={22}
                            tintColor={theme.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                            {language === 'hi' ? item.name.hi : item.name.en}
                          </ThemedText>
                          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }} numberOfLines={2}>
                            {language === 'hi' ? item.description.hi : item.description.en}
                          </ThemedText>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <SymbolView
                              name={{ ios: 'person.2.fill', android: 'groups', web: 'groups' } as any}
                              size={12}
                              tintColor={theme.textSecondary}
                            />
                            <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                              {item.members.length} {language === 'hi' ? 'सदस्य' : 'Members'}
                            </ThemedText>
                          </View>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => handleJoinLeave(item.id)}
                        style={({ pressed }) => [
                          styles.joinBtn,
                          {
                            backgroundColor: isJoined ? theme.backgroundElement : theme.primary,
                            borderColor: isJoined ? theme.border : theme.primary
                          },
                          pressed && { opacity: 0.8 }
                        ]}
                      >
                        <ThemedText
                          type="code"
                          style={{
                            color: isJoined ? theme.text : theme.onPrimary,
                            fontWeight: '700',
                            fontSize: 11
                          }}
                        >
                          {isJoined 
                            ? (language === 'hi' ? 'शामिल' : 'Joined')
                            : (language === 'hi' ? 'जुड़ें +' : 'Join +')}
                        </ThemedText>
                      </Pressable>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <ThemedText style={{ color: theme.textSecondary }}>
                      {language === 'hi' ? 'कोई चौपाल बोर्ड नहीं मिला।' : 'No boards found.'}
                    </ThemedText>
                  </View>
                }
              />
            ) : (
              // 2. consolidated feeds (My Feed, Trending)
              <FlatList
                data={feedPosts}
                keyExtractor={item => item.id}
                contentContainerStyle={[styles.scrollContent, contentPlatformStyle]}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isUpvoted = item.upvotes.includes(userPhone || 'demo');
                  const comm = communities.find(c => c.id === item.communityId);
                  
                  return (
                    <Pressable
                      onPress={() => {
                        setSelectedPost(item);
                        setActiveView('post-details');
                      }}
                      style={({ pressed }) => [
                        styles.postCard,
                        { backgroundColor: theme.card, borderColor: theme.border },
                        pressed && { opacity: 0.98 }
                      ]}
                    >
                      {/* Post Header */}
                      <View style={styles.postCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <ThemedText type="smallBold" style={{ fontSize: 13 }}>
                              {getLocalizedText(item.authorName, language)}
                            </ThemedText>
                            {comm && (
                              <ThemedText type="code" style={{ fontSize: 10, color: theme.primary, backgroundColor: theme.backgroundSelected, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                {language === 'hi' ? comm.name.hi : comm.name.en}
                              </ThemedText>
                            )}
                          </View>
                          <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary, marginTop: 1 }}>
                            {new Date(item.createdAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US')}
                          </ThemedText>
                        </View>
                        {item.tag && (
                          <ThemedText type="code" style={{ color: theme.accent, fontWeight: '700' }}>
                            {getLocalizedTag(item.tag, language)}
                          </ThemedText>
                        )}
                      </View>

                      {/* Post Title & Content */}
                      <ThemedText type="smallBold" style={styles.postTitle}>
                        {getLocalizedText(item.title, language)}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: theme.text, marginTop: 4 }} numberOfLines={3}>
                        {item.content}
                      </ThemedText>

                      {/* Rental Info if present */}
                      {item.rentPrice && (
                        <View style={[styles.rentSection, { backgroundColor: theme.backgroundElement, borderColor: theme.border, gap: 4 }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <SymbolView
                              name={{ ios: 'gear', android: 'agriculture', web: 'agriculture' } as any}
                              size={14}
                              tintColor={theme.accent}
                            />
                            <ThemedText type="smallBold" style={{ color: theme.accent, fontSize: 13 }}>
                              {language === 'hi' ? 'किराया दर' : 'Rental Rate'}: ₹{item.rentPrice}/{language === 'hi' ? (item.rentUnit === 'hour' ? 'घंटा' : 'दिन') : item.rentUnit}
                            </ThemedText>
                          </View>
                          {item.location && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <SymbolView
                                name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' } as any}
                                size={12}
                                tintColor={theme.textSecondary}
                              />
                              <ThemedText type="code" style={{ color: theme.textSecondary }}>
                                {item.location}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Post Media Rendering */}
                      {item.image && (
                        <Image
                          source={getPostImage(item.image)}
                          style={styles.postImage}
                          contentFit="cover"
                        />
                      )}

                      {/* Card Footer Actions */}
                      <View style={styles.cardFooter}>
                        <Pressable
                          onPress={() => handleUpvote(item.id)}
                          style={({ pressed }) => [
                            styles.footerActionBtn,
                            isUpvoted && { backgroundColor: theme.backgroundSelected },
                            pressed && { opacity: 0.8 }
                          ]}
                        >
                          <SymbolView
                            name={{ ios: 'hand.thumbsup.fill', android: 'thumb_up', web: 'thumb_up' } as any}
                            size={14}
                            tintColor={isUpvoted ? theme.primary : theme.textSecondary}
                          />
                          <ThemedText type="code" style={{ color: isUpvoted ? theme.primary : theme.textSecondary, fontWeight: '700' }}>
                            {item.upvotes.length}
                          </ThemedText>
                        </Pressable>

                        <View style={styles.footerActionBtn}>
                          <SymbolView
                            name={{ ios: 'bubble.left.and.bubble.right.fill', android: 'comment', web: 'comment' } as any}
                            size={14}
                            tintColor={theme.textSecondary}
                          />
                          <ThemedText type="code" style={{ color: theme.textSecondary, fontWeight: '700' }}>
                            {item.commentsCount}
                          </ThemedText>
                        </View>

                        {/* Delete option for own post */}
                        {item.authorPhone === userPhone && (
                          <Pressable
                            onPress={() => handleDeletePost(item.id)}
                            style={({ pressed }) => [
                              styles.footerActionBtn,
                              { marginLeft: 'auto' },
                              pressed && { opacity: 0.8 }
                            ]}
                          >
                            <SymbolView
                              name={{ ios: 'trash.fill', android: 'delete', web: 'delete' } as any}
                              size={14}
                              tintColor={theme.error}
                            />
                          </Pressable>
                        )}

                        {/* Report option for others' posts */}
                        {item.authorPhone !== userPhone && (
                          <Pressable
                            onPress={() => handleReportPost(item.id)}
                            style={({ pressed }) => [
                              styles.footerActionBtn,
                              { marginLeft: 'auto' },
                              pressed && { opacity: 0.8 }
                            ]}
                          >
                            <SymbolView
                              name={{ ios: 'flag.fill', android: 'flag', web: 'flag' } as any}
                              size={14}
                              tintColor={theme.textSecondary}
                            />
                          </Pressable>
                        )}
                      </View>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <ThemedText style={{ color: theme.textSecondary }}>
                      {language === 'hi' ? 'आपकी फ़ीड में कोई पोस्ट नहीं है।' : 'No posts in feed.'}
                    </ThemedText>
                  </View>
                }
              />
            )}
          </>
        )}

        {/* VIEW 2: COMMUNITY BOARD DETAILS */}
        {activeView === 'community-details' && selectedCommunity && (
          <>
            {/* Sub-Header */}
            <View style={styles.subPageHeader}>
              <Pressable
                onPress={() => {
                  setActiveView('main');
                  setSelectedCommunity(null);
                }}
                style={({ pressed }) => [
                  styles.backBtn,
                  { backgroundColor: theme.backgroundElement },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <SymbolView
                  name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as any}
                  size={20}
                  tintColor={theme.text}
                />
              </Pressable>
              
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" style={{ fontSize: 18 }} numberOfLines={1}>
                  {language === 'hi' ? selectedCommunity.name.hi : selectedCommunity.name.en}
                </ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <SymbolView
                    name={getCategoryIcon(selectedCommunity.category) as any}
                    size={12}
                    tintColor={theme.textSecondary}
                  />
                  <ThemedText type="code" style={{ fontSize: 11, color: theme.textSecondary }}>
                    {selectedCommunity.members.length} {language === 'hi' ? 'सदस्य' : 'Members'}
                  </ThemedText>
                </View>
              </View>

              <Pressable
                onPress={() => handleJoinLeave(selectedCommunity.id)}
                style={({ pressed }) => [
                  styles.joinHeaderBtn,
                  {
                    backgroundColor: selectedCommunity.members.includes(userPhone || 'demo')
                      ? theme.backgroundElement
                      : theme.primary,
                    borderColor: selectedCommunity.members.includes(userPhone || 'demo') ? theme.border : theme.primary
                  },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <ThemedText
                  type="code"
                  style={{
                    color: selectedCommunity.members.includes(userPhone || 'demo') ? theme.text : theme.onPrimary,
                    fontWeight: '700',
                    fontSize: 11
                  }}
                >
                  {selectedCommunity.members.includes(userPhone || 'demo')
                    ? (language === 'hi' ? 'शामिल' : 'Joined')
                    : (language === 'hi' ? 'जुड़ें +' : 'Join')}
                </ThemedText>
              </Pressable>
            </View>

            {/* Board Profile / Banner Card */}
            <ScrollView
              contentContainerStyle={[styles.scrollContent, contentPlatformStyle]}
              showsVerticalScrollIndicator={false}
            >
              <ThemedView type="card" style={[styles.descCard, { borderColor: theme.border }]}>
                <ThemedText type="small" style={{ color: theme.text }}>
                  {language === 'hi' ? selectedCommunity.description.hi : selectedCommunity.description.en}
                </ThemedText>
                <ThemedText type="code" style={{ color: theme.textSecondary, fontSize: 10, marginTop: 8 }}>
                  {language === 'hi' ? 'निर्माता' : 'Creator'}: {selectedCommunity.creator} • {new Date(selectedCommunity.createdAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US')}
                </ThemedText>
              </ThemedView>

              {/* Action Button: Create Post (only shown if joined) */}
              {selectedCommunity.members.includes(userPhone || 'demo') ? (
                <Pressable
                  onPress={() => {
                    setPostTag(selectedCommunity.category === 'machinery' ? '#Rent' : '#Question');
                    setCreatePostVisible(true);
                  }}
                  style={({ pressed }) => [
                    styles.createPostBar,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                    pressed && { opacity: 0.9 }
                  ]}
                >
                  <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                    <ThemedText type="code" style={{ color: theme.onPrimary, fontWeight: '700' }}>
                      {userName ? userName.charAt(0).toUpperCase() : 'K'}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
                    {language === 'hi' ? 'चर्चा शुरू करें या उपकरण साझा करें...' : 'Start a discussion or share machinery...'}
                  </ThemedText>
                  <SymbolView
                    name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' } as any}
                    size={18}
                    tintColor={theme.primary}
                  />
                </Pressable>
              ) : (
                <View style={[styles.joinBanner, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
                  <ThemedText type="smallBold" style={{ color: theme.primary, textAlign: 'center' }}>
                    {language === 'hi' ? 'इस चौपाल में पोस्ट करने के लिए पहले शामिल हों!' : 'Join this board to start posting!'}
                  </ThemedText>
                </View>
              )}

              {/* Posts in community */}
              <ThemedText type="smallBold" style={{ fontSize: 15, marginVertical: Spacing.two }}>
                {language === 'hi' ? 'चर्चाएं' : 'Discussions'}
              </ThemedText>

              {isLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : posts.length === 0 ? (
                <View style={{ paddingVertical: Spacing.four, alignItems: 'center' }}>
                  <ThemedText style={{ color: theme.textSecondary }}>
                    {language === 'hi' ? 'इस चौपाल पर कोई चर्चा नहीं है। पहली पोस्ट साझा करें!' : 'No posts yet. Be the first to share!'}
                  </ThemedText>
                </View>
              ) : (
                posts.map(item => {
                  const isUpvoted = item.upvotes.includes(userPhone || 'demo');
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setSelectedPost(item);
                        setActiveView('post-details');
                      }}
                      style={({ pressed }) => [
                        styles.postCard,
                        { backgroundColor: theme.card, borderColor: theme.border },
                        pressed && { opacity: 0.98 }
                      ]}
                    >
                      {/* Post Header */}
                      <View style={styles.postCardHeader}>
                        <View style={{ flex: 1 }}>
                          <ThemedText type="smallBold" style={{ fontSize: 12 }}>
                            {getLocalizedText(item.authorName, language)}
                          </ThemedText>
                          <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary, marginTop: 1 }}>
                            {new Date(item.createdAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US')}
                          </ThemedText>
                        </View>
                        {item.tag && (
                          <ThemedText type="code" style={{ color: theme.accent, fontWeight: '700' }}>
                            {getLocalizedTag(item.tag, language)}
                          </ThemedText>
                        )}
                      </View>

                      {/* Post Title & Content */}
                      <ThemedText type="smallBold" style={styles.postTitle}>
                        {getLocalizedText(item.title, language)}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: theme.text, marginTop: 4 }} numberOfLines={3}>
                        {item.content}
                      </ThemedText>

                      {/* Rental Info if present */}
                      {item.rentPrice && (
                        <View style={[styles.rentSection, { backgroundColor: theme.backgroundElement, borderColor: theme.border, gap: 4 }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <SymbolView
                              name={{ ios: 'gear', android: 'agriculture', web: 'agriculture' } as any}
                              size={14}
                              tintColor={theme.accent}
                            />
                            <ThemedText type="smallBold" style={{ color: theme.accent, fontSize: 13 }}>
                              {language === 'hi' ? 'किराया दर' : 'Rental Rate'}: ₹{item.rentPrice}/{language === 'hi' ? (item.rentUnit === 'hour' ? 'घंटा' : 'दिन') : item.rentUnit}
                            </ThemedText>
                          </View>
                          {item.location && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <SymbolView
                                name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' } as any}
                                size={12}
                                tintColor={theme.textSecondary}
                              />
                              <ThemedText type="code" style={{ color: theme.textSecondary }}>
                                {item.location}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                      )}

                      {/* Post Media Rendering */}
                      {item.image && (
                        <Image
                          source={getPostImage(item.image)}
                          style={styles.postImage}
                          contentFit="cover"
                        />
                      )}

                      {/* Card Footer Actions */}
                      <View style={styles.cardFooter}>
                        <Pressable
                          onPress={() => handleUpvote(item.id)}
                          style={({ pressed }) => [
                            styles.footerActionBtn,
                            isUpvoted && { backgroundColor: theme.backgroundSelected },
                            pressed && { opacity: 0.8 }
                          ]}
                        >
                          <SymbolView
                            name={{ ios: 'hand.thumbsup.fill', android: 'thumb_up', web: 'thumb_up' } as any}
                            size={14}
                            tintColor={isUpvoted ? theme.primary : theme.textSecondary}
                          />
                          <ThemedText type="code" style={{ color: isUpvoted ? theme.primary : theme.textSecondary, fontWeight: '700' }}>
                            {item.upvotes.length}
                          </ThemedText>
                        </Pressable>

                        <View style={styles.footerActionBtn}>
                          <SymbolView
                            name={{ ios: 'bubble.left.and.bubble.right.fill', android: 'comment', web: 'comment' } as any}
                            size={14}
                            tintColor={theme.textSecondary}
                          />
                          <ThemedText type="code" style={{ color: theme.textSecondary, fontWeight: '700' }}>
                            {item.commentsCount}
                          </ThemedText>
                        </View>

                        {/* Delete option for own post */}
                        {item.authorPhone === userPhone && (
                          <Pressable
                            onPress={() => handleDeletePost(item.id)}
                            style={({ pressed }) => [
                              styles.footerActionBtn,
                              { marginLeft: 'auto' },
                              pressed && { opacity: 0.8 }
                            ]}
                          >
                            <SymbolView
                              name={{ ios: 'trash.fill', android: 'delete', web: 'delete' } as any}
                              size={14}
                              tintColor={theme.error}
                            />
                          </Pressable>
                        )}

                        {/* Report option for others' posts */}
                        {item.authorPhone !== userPhone && (
                          <Pressable
                            onPress={() => handleReportPost(item.id)}
                            style={({ pressed }) => [
                              styles.footerActionBtn,
                              { marginLeft: 'auto' },
                              pressed && { opacity: 0.8 }
                            ]}
                          >
                            <SymbolView
                              name={{ ios: 'flag.fill', android: 'flag', web: 'flag' } as any}
                              size={14}
                              tintColor={theme.textSecondary}
                            />
                          </Pressable>
                        )}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </>
        )}

        {/* VIEW 3: POST DETAILS & COMMENTS */}
        {activeView === 'post-details' && selectedPost && (
          <>
            {/* Sub-Header */}
            <View style={styles.subPageHeader}>
              <Pressable
                onPress={() => {
                  // Go back to details if community selected, otherwise main
                  if (selectedCommunity) {
                    setActiveView('community-details');
                  } else {
                    setActiveView('main');
                  }
                  setSelectedPost(null);
                }}
                style={({ pressed }) => [
                  styles.backBtn,
                  { backgroundColor: theme.backgroundElement },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <SymbolView
                  name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as any}
                  size={20}
                  tintColor={theme.text}
                />
              </Pressable>
              
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                  {language === 'hi' ? 'चर्चा विवरण' : 'Discussion Details'}
                </ThemedText>
              </View>
            </View>

            {/* Post details body + comments list */}
            <FlatList
              data={comments}
              keyExtractor={item => item.id}
              contentContainerStyle={[styles.scrollContent, contentPlatformStyle]}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <ThemedView type="card" style={[styles.detailPostCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
                  {/* Header */}
                  <View style={styles.postCardHeader}>
                    <View>
                      <ThemedText type="smallBold" style={{ fontSize: 14 }}>
                        {getLocalizedText(selectedPost.authorName, language)}
                      </ThemedText>
                      <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary, marginTop: 2 }}>
                        {new Date(selectedPost.createdAt).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-US')}
                      </ThemedText>
                    </View>
                    {selectedPost.tag && (
                      <ThemedText type="code" style={{ color: theme.accent, fontWeight: '700' }}>
                        {getLocalizedTag(selectedPost.tag, language)}
                      </ThemedText>
                    )}
                  </View>

                  {/* Title & Body */}
                  <ThemedText type="smallBold" style={{ fontSize: 18, marginTop: Spacing.two }}>
                    {getLocalizedText(selectedPost.title, language)}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.text, marginTop: Spacing.two, lineHeight: 20 }}>
                    {selectedPost.content}
                  </ThemedText>

                  {/* Rental details */}
                  {selectedPost.rentPrice && (
                    <View style={[styles.rentSection, { backgroundColor: theme.backgroundElement, borderColor: theme.border, gap: 4 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <SymbolView
                          name={{ ios: 'gear', android: 'agriculture', web: 'agriculture' } as any}
                          size={14}
                          tintColor={theme.accent}
                        />
                        <ThemedText type="smallBold" style={{ color: theme.accent, fontSize: 14 }}>
                          {language === 'hi' ? 'किराया दर' : 'Rental Rate'}: ₹{selectedPost.rentPrice}/{language === 'hi' ? (selectedPost.rentUnit === 'hour' ? 'घंटा' : 'दिन') : selectedPost.rentUnit}
                        </ThemedText>
                      </View>
                      {selectedPost.location && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <SymbolView
                            name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' } as any}
                            size={12}
                            tintColor={theme.textSecondary}
                          />
                          <ThemedText type="code" style={{ color: theme.textSecondary }}>
                            {language === 'hi' ? 'स्थान' : 'Location'}: {selectedPost.location}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Media rendering */}
                  {selectedPost.image && (
                    <Image
                      source={getPostImage(selectedPost.image)}
                      style={[styles.postImage, { height: 250 }]}
                      contentFit="contain"
                    />
                  )}

                  {/* Actions */}
                  <View style={[styles.cardFooter, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: Spacing.two }]}>
                    <Pressable
                      onPress={() => handleUpvote(selectedPost.id)}
                      style={({ pressed }) => [
                        styles.footerActionBtn,
                        selectedPost.upvotes.includes(userPhone || 'demo') && { backgroundColor: theme.backgroundSelected },
                        pressed && { opacity: 0.8 }
                      ]}
                    >
                      <SymbolView
                        name={{ ios: 'hand.thumbsup.fill', android: 'thumb_up', web: 'thumb_up' } as any}
                        size={14}
                        tintColor={selectedPost.upvotes.includes(userPhone || 'demo') ? theme.primary : theme.textSecondary}
                      />
                      <ThemedText type="code" style={{ color: selectedPost.upvotes.includes(userPhone || 'demo') ? theme.primary : theme.textSecondary, fontWeight: '700' }}>
                        {selectedPost.upvotes.length} {language === 'hi' ? 'लाइक' : 'Likes'}
                      </ThemedText>
                    </Pressable>

                    {/* Delete and report buttons */}
                    {selectedPost.authorPhone === userPhone && (
                      <Pressable
                        onPress={() => handleDeletePost(selectedPost.id)}
                        style={({ pressed }) => [
                          styles.footerActionBtn,
                          { marginLeft: 'auto' },
                          pressed && { opacity: 0.8 }
                        ]}
                      >
                        <SymbolView
                          name={{ ios: 'trash.fill', android: 'delete', web: 'delete' } as any}
                          size={14}
                          tintColor={theme.error}
                        />
                        <ThemedText type="code" style={{ color: theme.error, fontWeight: '700' }}>
                          {language === 'hi' ? 'हटाएं' : 'Delete'}
                        </ThemedText>
                      </Pressable>
                    )}

                    {selectedPost.authorPhone !== userPhone && (
                      <Pressable
                        onPress={() => handleReportPost(selectedPost.id)}
                        style={({ pressed }) => [
                          styles.footerActionBtn,
                          { marginLeft: 'auto' },
                          pressed && { opacity: 0.8 }
                        ]}
                      >
                        <SymbolView
                          name={{ ios: 'flag.fill', android: 'flag', web: 'flag' } as any}
                          size={14}
                          tintColor={theme.textSecondary}
                        />
                        <ThemedText type="code" style={{ color: theme.textSecondary, fontWeight: '700' }}>
                          {language === 'hi' ? 'रिपोर्ट' : 'Report'}
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.four, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 6 }}>
                    <SymbolView
                      name={{ ios: 'bubble.left.and.bubble.right.fill', android: 'comment', web: 'comment' } as any}
                      size={16}
                      tintColor={theme.primary}
                    />
                    <ThemedText type="smallBold" style={{ fontSize: 15 }}>
                      {language === 'hi' ? 'टिप्पणियां' : 'Comments'} ({comments.length})
                    </ThemedText>
                  </View>
                </ThemedView>
              }
              renderItem={({ item }) => (
                <View style={[styles.commentCard, { borderBottomColor: theme.border }]}>
                  <View style={styles.commentHeader}>
                    <ThemedText type="smallBold" style={{ fontSize: 12 }}>{item.authorName}</ThemedText>
                    <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                      {new Date(item.createdAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US')}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" style={{ color: theme.text, marginTop: 4 }}>
                    {item.content}
                  </ThemedText>
                </View>
              )}
              ListEmptyComponent={
                <View style={{ paddingVertical: Spacing.four, alignItems: 'center' }}>
                  <ThemedText style={{ color: theme.textSecondary }}>
                    {language === 'hi' ? 'कोई टिप्पणी नहीं है। पहली टिप्पणी लिखें!' : 'No comments yet. Write the first comment!'}
                  </ThemedText>
                </View>
              }
            />

            {/* Comment writing input bar */}
            <View style={[styles.commentInputContainer, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
              <TextInput
                style={[
                  styles.commentInput,
                  { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }
                ]}
                placeholder={language === 'hi' ? 'अपनी टिप्पणी लिखें...' : 'Add a comment...'}
                placeholderTextColor={theme.textSecondary}
                value={newCommentText}
                onChangeText={setNewCommentText}
                multiline
              />
              <Pressable
                onPress={handleSubmitComment}
                disabled={!newCommentText.trim()}
                style={({ pressed }) => [
                  styles.commentSendBtn,
                  { backgroundColor: newCommentText.trim() ? theme.primary : theme.backgroundElement },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <SymbolView
                  name={{ ios: 'paperplane.fill', android: 'send', web: 'send' } as any}
                  size={16}
                  tintColor={newCommentText.trim() ? theme.onPrimary : theme.textSecondary}
                />
              </Pressable>
            </View>
          </>
        )}

        {/* MODAL 1: CREATE COMMUNITY BOARD */}
        <Modal visible={createCommunityVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <ThemedView type="card" style={[styles.modalCard, { borderColor: theme.border }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="smallBold" style={{ fontSize: 18 }}>
                  {language === 'hi' ? 'नई चौपाल बनाएं' : 'Create New Chowpal'}
                </ThemedText>
                <Pressable onPress={() => setCreateCommunityVisible(false)}>
                  <SymbolView
                    name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' } as any}
                    size={24}
                    tintColor={theme.textSecondary}
                  />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.modalForm} showsVerticalScrollIndicator={false}>
                {/* Board Category */}
                <ThemedText type="code" style={styles.formLabel}>
                  {language === 'hi' ? 'श्रेणी (Category)' : 'CATEGORY'}
                </ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.three }}>
                  {[
                    { key: 'general', label: language === 'hi' ? 'सामान्य (General)' : 'General' },
                    { key: 'crops', label: language === 'hi' ? 'फसलें (Crops)' : 'Crops' },
                    { key: 'machinery', label: language === 'hi' ? 'मशीनरी (Machinery)' : 'Machinery' },
                    { key: 'weather', label: language === 'hi' ? 'मौसम (Weather)' : 'Weather' }
                  ].map(cat => {
                    const isSelected = commCategory === cat.key;
                    return (
                      <Pressable
                        key={cat.key}
                        onPress={() => {
                          setCommCategory(cat.key as any);
                          setCommAvatar(cat.key);
                        }}
                        style={[
                          styles.formCategoryPill,
                          {
                            borderColor: isSelected ? theme.primary : theme.border,
                            backgroundColor: isSelected ? theme.backgroundSelected : theme.backgroundElement,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6
                          }
                        ]}
                      >
                        <SymbolView
                          name={getCategoryIcon(cat.key) as any}
                          size={12}
                          tintColor={isSelected ? theme.primary : theme.textSecondary}
                        />
                        <ThemedText type="code" style={{ color: isSelected ? theme.primary : theme.text }}>
                          {cat.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Name */}
                <ThemedText type="code" style={styles.formLabel}>
                  {language === 'hi' ? 'चौपाल नाम (Name)' : 'BOARD NAME'}
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                  placeholder={language === 'hi' ? 'जैसे: टमाटर उत्पादक संघ या Tomato Farmers Hub' : 'e.g. Tomato Farmers Hub'}
                  value={commName}
                  onChangeText={setCommName}
                />

                {/* Description */}
                <ThemedText type="code" style={styles.formLabel}>
                  {language === 'hi' ? 'विवरण (Description)' : 'BOARD DESCRIPTION'}
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement, height: 70 }]}
                  placeholder={language === 'hi' ? 'संक्षिप्त विवरण लिखें...' : 'Enter brief description...'}
                  value={commDesc}
                  onChangeText={setCommDesc}
                  multiline
                />

                {/* Submit button */}
                <Pressable
                  onPress={handleSubmitCommunity}
                  disabled={isSubmitting}
                  style={({ pressed }) => [
                    styles.formSubmitBtn,
                    { backgroundColor: theme.primary },
                    pressed && { opacity: 0.9 }
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={theme.onPrimary} />
                  ) : (
                    <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                      {language === 'hi' ? 'चौपाल बनाएं' : 'Create Chowpal'}
                    </ThemedText>
                  )}
                </Pressable>
              </ScrollView>
            </ThemedView>
          </View>
        </Modal>

        {/* MODAL 2: CREATE POST */}
        <Modal visible={createPostVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <ThemedView type="card" style={[styles.modalCard, { borderColor: theme.border }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="smallBold" style={{ fontSize: 18 }}>
                  {language === 'hi' ? 'नई पोस्ट साझा करें' : 'Create New Post'}
                </ThemedText>
                <Pressable onPress={() => setCreatePostVisible(false)}>
                  <SymbolView
                    name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' } as any}
                    size={24}
                    tintColor={theme.textSecondary}
                  />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.modalForm} showsVerticalScrollIndicator={false}>
                {/* Selected Board Header */}
                {selectedCommunity && (
                  <View style={[styles.commBannerPill, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type="code" style={{ color: theme.primary, fontWeight: '700' }}>
                      📢 {language === 'hi' ? 'पोस्टिंग स्थान' : 'Posting in'}: {language === 'hi' ? selectedCommunity.name.hi : selectedCommunity.name.en}
                    </ThemedText>
                  </View>
                )}

                {/* Tag Selection */}
                <ThemedText type="code" style={styles.formLabel}>
                  {language === 'hi' ? 'विषय टैग (Tag)' : 'TOPIC TAG'}
                </ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.three }}>
                  {(selectedCommunity?.category === 'machinery'
                    ? ['#Rent', '#Buy', '#Sell', '#General']
                    : selectedCommunity?.category === 'crops'
                    ? ['#Question', '#Wheat', '#Pest', '#Advice']
                    : selectedCommunity?.category === 'weather'
                    ? ['#Weather', '#Rain', '#Frost', '#Alert']
                    : ['#Question', '#General', '#Advice', '#Discussion']
                  ).map(t => {
                    const isSelected = postTag === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() => setPostTag(t)}
                        style={[
                          styles.formCategoryPill,
                          {
                            borderColor: isSelected ? theme.primary : theme.border,
                            backgroundColor: isSelected ? theme.backgroundSelected : theme.backgroundElement
                          }
                        ]}
                      >
                        <ThemedText type="code" style={{ color: isSelected ? theme.primary : theme.text }}>
                          {getLocalizedTag(t, language)}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Title */}
                <ThemedText type="code" style={styles.formLabel}>
                  {language === 'hi' ? 'शीर्षक' : 'POST TITLE'}
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                  placeholder={language === 'hi' ? 'पोस्ट का मुख्य शीर्षक...' : 'Enter post title...'}
                  value={postTitle}
                  onChangeText={setPostTitle}
                />

                {/* Content */}
                <ThemedText type="code" style={styles.formLabel}>
                  {language === 'hi' ? 'विवरण' : 'DETAILS / DESCRIPTION'}
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement, height: 100 }]}
                  placeholder={language === 'hi' ? 'अपनी बात विस्तार से साझा करें...' : 'Describe your post details...'}
                  value={postContent}
                  onChangeText={setPostContent}
                  multiline
                />

                {/* Conditional Fields: Machinery Rent Details */}
                {selectedCommunity?.category === 'machinery' && postTag === '#Rent' && (
                  <View style={[styles.formRentGroup, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <SymbolView
                        name={{ ios: 'gear', android: 'agriculture', web: 'agriculture' } as any}
                        size={16}
                        tintColor={theme.primary}
                      />
                      <ThemedText type="smallBold" style={{ fontSize: 13, color: theme.primary }}>
                        {language === 'hi' ? 'किराया विवरण दर्ज करें' : 'Enter Rent Specifications'}
                      </ThemedText>
                    </View>

                    <View style={{ flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two }}>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                          {language === 'hi' ? 'दर (₹)' : 'RATE (₹)'}
                        </ThemedText>
                        <TextInput
                          style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card, marginTop: 4 }]}
                          placeholder="e.g. 500"
                          keyboardType="numeric"
                          value={postRentPrice}
                          onChangeText={setPostRentPrice}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                          {language === 'hi' ? 'इकाई (Unit)' : 'UNIT'}
                        </ThemedText>
                        <View style={{ flexDirection: 'row', gap: Spacing.one, marginTop: 4, height: 40 }}>
                          {['hour', 'day'].map(u => (
                            <Pressable
                              key={u}
                              onPress={() => setPostRentUnit(u as any)}
                              style={{
                                flex: 1,
                                borderWidth: 1,
                                borderColor: postRentUnit === u ? theme.primary : theme.border,
                                backgroundColor: postRentUnit === u ? theme.backgroundSelected : theme.card,
                                borderRadius: 8,
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <ThemedText type="code" style={{ fontSize: 11 }}>
                                {language === 'hi' ? (u === 'hour' ? 'घंटा' : 'दिन') : u}
                              </ThemedText>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </View>

                    <ThemedText type="code" style={{ fontSize: 10, color: theme.textSecondary }}>
                      {language === 'hi' ? 'स्थान (क्षेत्र/गाँव)' : 'LOCATION / DISTRICT'}
                    </ThemedText>
                    <TextInput
                      style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card, marginTop: 4 }]}
                      placeholder="e.g. Karnal, Haryana"
                      value={postLocation}
                      onChangeText={setPostLocation}
                    />
                  </View>
                )}

                {/* Upload Image Selector */}
                <ThemedText type="code" style={styles.formLabel}>
                  {language === 'hi' ? 'फोटो अपलोड करें (वैकल्पिक)' : 'UPLOAD PHOTO (OPTIONAL)'}
                </ThemedText>
                <View style={{ flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.three }}>
                  <Pressable
                    onPress={() => pickPostImage(true)}
                    style={({ pressed }) => [
                      styles.modalPhotoBtn,
                      { borderColor: theme.primary, backgroundColor: theme.backgroundElement },
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    <SymbolView
                      name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' } as any}
                      size={18}
                      tintColor={theme.primary}
                    />
                    <ThemedText type="code" style={{ color: theme.primary, fontWeight: '700', fontSize: 12 }}>
                      {language === 'hi' ? 'कैमरा' : 'Camera'}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={() => pickPostImage(false)}
                    style={({ pressed }) => [
                      styles.modalPhotoBtn,
                      { borderColor: theme.primary, backgroundColor: theme.backgroundElement },
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    <SymbolView
                      name={{ ios: 'photo.on.rectangle.angled', android: 'photo_library', web: 'photo_library' } as any}
                      size={18}
                      tintColor={theme.primary}
                    />
                    <ThemedText type="code" style={{ color: theme.primary, fontWeight: '700', fontSize: 12 }}>
                      {language === 'hi' ? 'गैलरी' : 'Gallery'}
                    </ThemedText>
                  </Pressable>
                </View>

                {/* Selected Image Preview */}
                {postImage && (
                  <View style={styles.imagePreviewContainer}>
                    <RNImage source={{ uri: postImage }} style={styles.imagePreview} />
                    <Pressable
                      onPress={() => setPostImage(null)}
                      style={[styles.removeImageBtn, { backgroundColor: theme.error }]}
                    >
                      <SymbolView
                        name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' } as any}
                        size={18}
                        tintColor="#FFF"
                      />
                    </Pressable>
                  </View>
                )}

                {/* Submit button */}
                <Pressable
                  onPress={handleSubmitPost}
                  disabled={isSubmitting}
                  style={({ pressed }) => [
                    styles.formSubmitBtn,
                    { backgroundColor: theme.primary },
                    pressed && { opacity: 0.9 }
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={theme.onPrimary} />
                  ) : (
                    <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                      {language === 'hi' ? 'पोस्ट साझा करें' : 'Publish Post'}
                    </ThemedText>
                  )}
                </Pressable>
              </ScrollView>
            </ThemedView>
          </View>
        </Modal>

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'column',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five
  },
  emptyContainer: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three
  },
  headerTitle: {
    fontSize: 22,
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.three
  },
  tabButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginRight: Spacing.two
  },
  searchContainer: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    width: '100%'
  },
  searchInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    fontSize: 13,
  },
  categoryFiltersWrapper: {
    paddingBottom: Spacing.two,
    width: '100%'
  },
  categoryFilters: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two
  },
  boardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  boardCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
    paddingRight: Spacing.two
  },
  boardEmojiBg: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.15)'
  },
  joinBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center'
  },
  postCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  postCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.two
  },
  postTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  rentSection: {
    marginTop: Spacing.two,
    padding: Spacing.two,
    borderRadius: 8,
    borderWidth: 1,
  },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginTop: Spacing.two,
    backgroundColor: '#F0F0F0'
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  footerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  subPageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinHeaderBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  descCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  createPostBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBanner: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center'
  },
  detailPostCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  commentCard: {
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.one,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    gap: Spacing.two,
    ...Platform.select({
      web: {
        position: 'sticky',
        bottom: 0,
        zIndex: 10
      } as any
    })
  },
  commentInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 13,
    paddingTop: Platform.OS === 'ios' ? 10 : 6
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  modalCard: {
    width: '100%',
    maxWidth: MaxContentWidth,
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: Spacing.three,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.three
  },
  modalForm: {
    paddingBottom: Spacing.six
  },
  formLabel: {
    fontSize: 10,
    color: '#7A9E83',
    fontWeight: '700',
    marginTop: Spacing.three,
    marginBottom: 6
  },
  commBannerPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: Spacing.two,
  },
  formInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 13,
  },
  formCategoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  formRentGroup: {
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: Spacing.three,
  },
  modalPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 120,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: Spacing.three,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 10,
  },
  formSubmitBtn: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.four,
  }
});
