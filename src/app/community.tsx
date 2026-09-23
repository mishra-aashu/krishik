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
import Animated, { FadeIn, FadeInRight, FadeInUp } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SymbolView } from 'expo-symbols';
import { Colors, Fonts, Spacing, BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/auth-context';
import { LocalStorage } from '@/utils/storage';
import { CommunityService, type Community, type Post, type Comment } from '@/services/community-service';
import { compressAndResizeImage, saveImageToLocalFileSystem, resolveLocalImageUri } from '@/utils/image-compress';
import { uploadImageToImgBB } from '@/services/imgbb-service';
import { useNetInfo } from '@react-native-community/netinfo';
import OfflineNotice from '@/components/offline-notice';

// Custom helper to resolve static assets for seeded posts or fallback to URI
const getPostImage = (imagePath: string | null) => {
  if (!imagePath) return null;
  const resolved = resolveLocalImageUri(imagePath);
  if (!resolved) return null;
  if (resolved.startsWith('data:image')) return { uri: resolved };
  if (resolved === 'seed_tractor.png') return require('../../assets/images/seed_tractor.png');
  if (resolved === 'seed_wheat.png') return require('../../assets/images/seed_wheat.png');
  return { uri: resolved };
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
  const isMobile = width < 640;
  const { userName, userPhone } = useAuth();
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false;

  // Language state
  const [language, setLanguage] = useState<'hi' | 'en'>('en');

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
  // 'create-community' = Subpage to create a new community board
  // 'create-post' = Subpage to create a new post
  const [activeView, setActiveView] = useState<'main' | 'community-details' | 'post-details' | 'create-community' | 'create-post'>('main');
  const [activeTab, setActiveTab] = useState<'my-feed' | 'communities'>('my-feed');
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [boardSubTab, setBoardSubTab] = useState<'posts' | 'about'>('posts');

  // Filter category for community list ('all', 'crops', 'machinery', 'weather', 'general')
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Core Data Lists
  const [communities, setCommunities] = useState<Community[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Action Menu Visibility
  const [createActionMenuVisible, setCreateActionMenuVisible] = useState(false);

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
    if (isOffline) return;
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
    if (isOffline) return;
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
      setActiveView('main');
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
        const compressed = await compressAndResizeImage(asset.uri);
        const permanentUri = await saveImageToLocalFileSystem(compressed);
        setPostImage(permanentUri);
      }
    } catch (err) {
      console.error('Error picking post image:', err);
    }
  };

  // Submit Post
  const handleSubmitPost = async () => {
    if (isOffline) return;
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
      let hostedImageUrl: string | null = null;
      if (postImage) {
        hostedImageUrl = await uploadImageToImgBB(postImage);
      }

      const price = postRentPrice ? parseFloat(postRentPrice) : null;
      const freshPost = await CommunityService.createPost(
        selectedCommunity.id,
        userName || 'Kisan',
        userPhone || 'demo',
        postTitle,
        postContent,
        postTag,
        hostedImageUrl,
        price,
        price ? postRentUnit : null,
        postLocation || null
      );
      
      setPosts(prev => [freshPost, ...prev]);
      if (selectedCommunity) {
        setActiveView('community-details');
      } else {
        setActiveView('main');
      }
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
    if (isOffline) return;
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
      // Show posts from communities the user joined, or all posts if none joined yet
      const joinedCommIds = communities
        .filter(c => c.members.includes(userPhone || 'demo'))
        .map(c => c.id);
      const joinedPosts = list.filter(p => joinedCommIds.includes(p.communityId));
      return joinedPosts.length > 0 ? joinedPosts : list;
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
        <OfflineNotice language={language} />
        
        {/* VIEW 1: MAIN BOARD SECTION */}
        {activeView === 'main' && (
          <Animated.View entering={FadeIn.duration(240)} style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1, marginRight: Spacing.two }}>
                <ThemedText type="smallBold" style={[styles.headerTitle, isMobile && { fontSize: 18 }]} numberOfLines={1}>
                  {language === 'hi' ? 'किसान चौपाल' : 'Farmers Chowpal'}
                </ThemedText>
                <ThemedText type="small" style={[styles.headerSub, { color: theme.textSecondary, fontWeight: '600' }]} numberOfLines={1}>
                  {language === 'hi' ? 'आपसी चर्चा और साझेदारी मंच' : 'Peer-to-Peer Sharing & Forums'}
                </ThemedText>
              </View>

              <View style={{ flexDirection: 'row', gap: isMobile ? 6 : Spacing.two, alignItems: 'center' }}>
                <Pressable
                  onPress={toggleLanguage}
                  style={({ pressed }) => [
                    styles.headerActionBtn,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                    isMobile && { paddingHorizontal: 8, paddingVertical: 5 },
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
              </View>
            </View>

            {/* Tab selection bar: Posts & Feed (Left) vs Boards (Right) */}
            <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
              <Pressable
                onPress={() => { setActiveTab('my-feed'); setSearchQuery(''); }}
                style={[
                  styles.tabButton,
                  activeTab === 'my-feed' && { borderBottomColor: theme.primary }
                ]}
              >
                <SymbolView
                  name={{ ios: 'tray.full.fill', android: 'feed', web: 'feed' } as any}
                  size={15}
                  tintColor={activeTab === 'my-feed' ? theme.primary : theme.textSecondary}
                />
                <ThemedText
                  type="smallBold"
                  style={{
                    color: activeTab === 'my-feed' ? theme.primary : theme.textSecondary,
                    fontSize: 13
                  }}
                  numberOfLines={1}
                >
                  {language === 'hi' ? 'फ़ीड व पोस्ट्स' : 'My Feed'}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => { setActiveTab('communities'); setSearchQuery(''); }}
                style={[
                  styles.tabButton,
                  activeTab === 'communities' && { borderBottomColor: theme.primary }
                ]}
              >
                <SymbolView
                  name={{ ios: 'square.grid.2x2.fill', android: 'grid_view', web: 'grid_view' } as any}
                  size={15}
                  tintColor={activeTab === 'communities' ? theme.primary : theme.textSecondary}
                />
                <ThemedText
                  type="smallBold"
                  style={{
                    color: activeTab === 'communities' ? theme.primary : theme.textSecondary,
                    fontSize: 13
                  }}
                  numberOfLines={1}
                >
                  {language === 'hi' ? 'चौपाल सूची' : 'Boards'}
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
                        onPress={() => {
                          if (isOffline) {
                            Alert.alert(
                              language === 'hi' ? 'ऑफ़लाइन' : 'Offline',
                              language === 'hi' ? 'ऑफ़लाइन होने पर आप चौपाल में शामिल या बाहर नहीं हो सकते।' : 'You cannot join or leave communities while offline.'
                            );
                            return;
                          }
                          handleJoinLeave(item.id);
                        }}
                        style={({ pressed }) => [
                          styles.joinBtn,
                          {
                            backgroundColor: isOffline ? theme.border : isJoined ? theme.backgroundElement : theme.primary,
                            borderColor: isJoined ? theme.border : theme.primary
                          },
                          pressed && { opacity: 0.8 }
                        ]}
                      >
                        <ThemedText
                          type="code"
                          style={{
                            color: isOffline ? theme.textSecondary : isJoined ? theme.text : theme.onPrimary,
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

            {/* FLOATING ACTION BUTTON: PLUS ICON CHOICE FAB */}
            <Animated.View entering={FadeIn.duration(300)} style={styles.floatingFabContainer}>
              <Pressable
                onPress={() => setCreateActionMenuVisible(true)}
                style={({ pressed }) => [
                  styles.floatingPlusFab,
                  { backgroundColor: isOffline ? theme.border : '#059669' },
                  pressed && styles.floatingBoardFabPressed
                ]}
              >
                <SymbolView
                  name={{ ios: 'plus', android: 'add', web: 'add' } as any}
                  size={26}
                  tintColor={isOffline ? theme.textSecondary : '#FFFFFF'}
                />
              </Pressable>
            </Animated.View>
          </Animated.View>
        )}

        {/* VIEW 2: COMMUNITY BOARD DETAILS (REDDIT STYLE) */}
        {activeView === 'community-details' && selectedCommunity && (
          <Animated.View entering={FadeInRight.duration(260)} style={{ flex: 1, position: 'relative' }}>
            {/* Sticky Back Button */}
            <Pressable
              onPress={() => {
                setActiveView('main');
                setSelectedCommunity(null);
              }}
              style={({ pressed }) => [
                styles.redditBackBtn,
                pressed && { opacity: 0.8 }
              ]}
              hitSlop={8}
            >
              <SymbolView
                name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as any}
                size={18}
                tintColor="#FFFFFF"
              />
            </Pressable>

            <ScrollView
              contentContainerStyle={[styles.scrollContent, contentPlatformStyle, { paddingHorizontal: 0, paddingTop: 0 }]}
              showsVerticalScrollIndicator={false}
            >
              {/* 1. Reddit Cover Banner */}
              <View style={[styles.redditCoverBanner, { backgroundColor: theme.dark ? '#0F172A' : '#1E293B' }]}>
                <View style={styles.redditBannerOverlay}>
                  <SymbolView
                    name={getCategoryIcon(selectedCommunity.category) as any}
                    size={110}
                    tintColor="rgba(255, 255, 255, 0.08)"
                  />
                </View>
              </View>

            {/* 2. Board Profile Header Container */}
            <View style={[styles.redditProfileHeader, { paddingHorizontal: isMobile ? Spacing.three : Spacing.four }]}>
              <View style={styles.redditAvatarRow}>
                {/* Overlapping Avatar */}
                <View style={[styles.redditAvatar, { backgroundColor: theme.primary, borderColor: theme.background }]}>
                  <SymbolView
                    name={getCategoryIcon(selectedCommunity.category) as any}
                    size={32}
                    tintColor={theme.onPrimary}
                  />
                </View>

                {/* Join / Joined Pill Button */}
                <Pressable
                  onPress={() => {
                    if (isOffline) {
                      Alert.alert(
                        language === 'hi' ? 'ऑफ़लाइन' : 'Offline',
                        language === 'hi' ? 'ऑफ़लाइन होने पर आप चौपाल में शामिल या बाहर नहीं हो सकते।' : 'You cannot join or leave communities while offline.'
                      );
                      return;
                    }
                    handleJoinLeave(selectedCommunity.id);
                  }}
                  style={({ pressed }) => [
                    styles.redditJoinBtn,
                    {
                      backgroundColor: isOffline
                        ? theme.border
                        : selectedCommunity.members.includes(userPhone || 'demo')
                          ? (theme.dark ? '#27272A' : '#E2E8F0')
                          : '#059669',
                      borderColor: selectedCommunity.members.includes(userPhone || 'demo')
                        ? (theme.dark ? '#3F3F46' : '#CBD5E1')
                        : '#047857'
                    },
                    pressed && { opacity: 0.85 }
                  ]}
                >
                  <SymbolView
                    name={{
                      ios: selectedCommunity.members.includes(userPhone || 'demo') ? 'checkmark' : 'plus',
                      android: selectedCommunity.members.includes(userPhone || 'demo') ? 'check' : 'add',
                      web: selectedCommunity.members.includes(userPhone || 'demo') ? 'check' : 'add'
                    } as any}
                    size={14}
                    tintColor={
                      isOffline
                        ? theme.textSecondary
                        : selectedCommunity.members.includes(userPhone || 'demo')
                          ? (theme.dark ? '#F4F4F5' : '#1E293B')
                          : '#FFFFFF'
                    }
                  />
                  <ThemedText
                    type="smallBold"
                    style={{
                      color: isOffline
                        ? theme.textSecondary
                        : selectedCommunity.members.includes(userPhone || 'demo')
                          ? (theme.dark ? '#F4F4F5' : '#1E293B')
                          : '#FFFFFF',
                      fontSize: 13,
                      fontWeight: '700'
                    }}
                  >
                    {selectedCommunity.members.includes(userPhone || 'demo')
                      ? (language === 'hi' ? 'शामिल (Joined)' : 'Joined')
                      : (language === 'hi' ? 'शामिल हों' : 'Join')}
                  </ThemedText>
                </Pressable>
              </View>

              {/* Title & Community Handle */}
              <ThemedText type="title" style={{ fontSize: 22, fontWeight: '800', marginTop: 10 }}>
                {language === 'hi' ? selectedCommunity.name.hi : selectedCommunity.name.en}
              </ThemedText>
              <ThemedText type="code" style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                c/{selectedCommunity.id} • {language === 'hi' ? 'आधिकारिक चौपाल' : 'Official Board'}
              </ThemedText>

              {/* Description */}
              <ThemedText type="small" style={{ color: theme.text, fontSize: 13.5, lineHeight: 20, marginTop: 8 }}>
                {language === 'hi' ? selectedCommunity.description.hi : selectedCommunity.description.en}
              </ThemedText>

              {/* Reddit Stats Row */}
              <View style={[styles.redditStatsBar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <View style={styles.redditStatItem}>
                  <ThemedText type="smallBold" style={{ fontSize: 15, fontWeight: '800' }}>
                    {selectedCommunity.members.length.toLocaleString()}
                  </ThemedText>
                  <ThemedText type="code" style={{ fontSize: 11, color: theme.textSecondary }}>
                    {language === 'hi' ? 'सदस्य' : 'Members'}
                  </ThemedText>
                </View>

                <View style={[styles.redditStatDivider, { backgroundColor: theme.border }]} />

                <View style={styles.redditStatItem}>
                  <ThemedText type="smallBold" style={{ fontSize: 15, fontWeight: '800' }}>
                    {posts.length}
                  </ThemedText>
                  <ThemedText type="code" style={{ fontSize: 11, color: theme.textSecondary }}>
                    {language === 'hi' ? 'पोस्ट्स' : 'Posts'}
                  </ThemedText>
                </View>

                <View style={[styles.redditStatDivider, { backgroundColor: theme.border }]} />

                <View style={styles.redditStatItem}>
                  <ThemedText type="smallBold" style={{ fontSize: 15, fontWeight: '800' }}>
                    {new Date(selectedCommunity.createdAt).getFullYear()}
                  </ThemedText>
                  <ThemedText type="code" style={{ fontSize: 11, color: theme.textSecondary }}>
                    {language === 'hi' ? 'स्थापना' : 'Created'}
                  </ThemedText>
                </View>
              </View>

              {/* Reddit Sub-Tabs: [ Posts ] [ About ] */}
              <View style={[styles.redditSubTabBar, { borderBottomColor: theme.border }]}>
                <Pressable
                  onPress={() => setBoardSubTab('posts')}
                  style={[
                    styles.redditSubTabBtn,
                    boardSubTab === 'posts' && { borderBottomColor: theme.primary }
                  ]}
                >
                  <ThemedText
                    type="smallBold"
                    style={{
                      color: boardSubTab === 'posts' ? theme.primary : theme.textSecondary,
                      fontSize: 14
                    }}
                  >
                    {language === 'hi' ? 'पोस्ट्स (Posts)' : 'Posts'}
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => setBoardSubTab('about')}
                  style={[
                    styles.redditSubTabBtn,
                    boardSubTab === 'about' && { borderBottomColor: theme.primary }
                  ]}
                >
                  <ThemedText
                    type="smallBold"
                    style={{
                      color: boardSubTab === 'about' ? theme.primary : theme.textSecondary,
                      fontSize: 14
                    }}
                  >
                    {language === 'hi' ? 'जानकारी (About)' : 'About'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Sub-Tab Content Area */}
            <View style={{ paddingHorizontal: isMobile ? Spacing.three : Spacing.four, paddingTop: Spacing.two }}>
              {boardSubTab === 'posts' ? (
                <>
                  {/* Create Post Action Input Bar (if joined) */}
                  {selectedCommunity.members.includes(userPhone || 'demo') ? (
                    <Pressable
                      onPress={() => {
                        if (isOffline) {
                          Alert.alert(
                            language === 'hi' ? 'ऑफ़लाइन' : 'Offline',
                            language === 'hi' ? 'ऑफ़लाइन होने पर आप नई पोस्ट नहीं बना सकते।' : 'You cannot create a new post while offline.'
                          );
                          return;
                        }
                        setPostTag(selectedCommunity.category === 'machinery' ? '#Rent' : '#Question');
                        setActiveView('create-post');
                      }}
                      style={({ pressed }) => [
                        styles.createPostBar,
                        {
                          backgroundColor: theme.backgroundElement,
                          borderColor: theme.border,
                          opacity: isOffline ? 0.6 : 1
                        },
                        pressed && { opacity: 0.9 }
                      ]}
                    >
                      <View style={[styles.avatarPlaceholder, { backgroundColor: isOffline ? theme.border : theme.primary }]}>
                        <ThemedText type="code" style={{ color: isOffline ? theme.textSecondary : theme.onPrimary, fontWeight: '700' }}>
                          {userName ? userName.charAt(0).toUpperCase() : 'K'}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
                        {isOffline
                          ? (language === 'hi' ? 'ऑफ़लाइन होने पर पोस्टिंग अक्षम है' : 'Posting is disabled offline')
                          : (language === 'hi' ? 'इस चौपाल में चर्चा शुरू करें...' : 'Create a post in this board...')}
                      </ThemedText>
                      <SymbolView
                        name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' } as any}
                        size={18}
                        tintColor={isOffline ? theme.textSecondary : theme.primary}
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
                  {isLoading ? (
                    <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 20 }} />
                  ) : posts.length === 0 ? (
                    <View style={{ paddingVertical: Spacing.five, alignItems: 'center' }}>
                      <SymbolView
                        name={{ ios: 'doc.text.magnifyingglass', android: 'article', web: 'article' } as any}
                        size={36}
                        tintColor={theme.textSecondary}
                      />
                      <ThemedText style={{ color: theme.textSecondary, marginTop: 8 }}>
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
                </>
              ) : (
                /* About Tab Content */
                <View style={{ gap: Spacing.three, paddingBottom: Spacing.four }}>
                  <ThemedView type="card" style={[styles.descCard, { borderColor: theme.border }]}>
                    <ThemedText type="smallBold" style={{ fontSize: 16, marginBottom: 8, color: theme.primary }}>
                      {language === 'hi' ? 'चौपाल के नियम व निर्देश' : 'Board Rules & Guidelines'}
                    </ThemedText>
                    <View style={{ gap: 10 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <ThemedText type="smallBold" style={{ color: theme.primary }}>1.</ThemedText>
                        <ThemedText type="small" style={{ color: theme.text, flex: 1 }}>
                          {language === 'hi' ? 'सभी किसान भाइयों व बहनों के साथ सम्मानजनक व्यवहार करें।' : 'Be respectful to all fellow farmers and community members.'}
                        </ThemedText>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <ThemedText type="smallBold" style={{ color: theme.primary }}>2.</ThemedText>
                        <ThemedText type="small" style={{ color: theme.text, flex: 1 }}>
                          {language === 'hi' ? 'केवल सटीक कृषि, फ़सल, मंडी व उपकरण संबंधी विषय साझा करें।' : 'Share verified agricultural, crop, mandi rates, and equipment info.'}
                        </ThemedText>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <ThemedText type="smallBold" style={{ color: theme.primary }}>3.</ThemedText>
                        <ThemedText type="small" style={{ color: theme.text, flex: 1 }}>
                          {language === 'hi' ? 'किसी भी प्रकार का स्पैम, विज्ञापन या अफ़वाह सख्त मना है।' : 'Strictly no spam, fake rumors, or unverified commercial ads.'}
                        </ThemedText>
                      </View>
                    </View>
                  </ThemedView>

                  <ThemedView type="card" style={[styles.descCard, { borderColor: theme.border }]}>
                    <ThemedText type="smallBold" style={{ fontSize: 15, marginBottom: 8 }}>
                      {language === 'hi' ? 'चौपाल विवरण व प्रबंधन' : 'Board Details & Admin'}
                    </ThemedText>
                    <ThemedText type="code" style={{ color: theme.textSecondary, fontSize: 12 }}>
                      {language === 'hi' ? 'निर्माता' : 'Creator'}: {selectedCommunity.creator}
                    </ThemedText>
                    <ThemedText type="code" style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
                      {language === 'hi' ? 'स्थापना तिथि' : 'Created Date'}: {new Date(selectedCommunity.createdAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US')}
                    </ThemedText>
                    <ThemedText type="code" style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
                      {language === 'hi' ? 'कुल सदस्य संख्या' : 'Total Members'}: {selectedCommunity.members.length}
                    </ThemedText>
                  </ThemedView>
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      )}

        {/* VIEW 3: POST DETAILS & COMMENTS */}
        {activeView === 'post-details' && selectedPost && (
          <Animated.View entering={FadeInRight.duration(260)} style={{ flex: 1 }}>
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
                  { color: isOffline ? theme.textSecondary : theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }
                ]}
                placeholder={isOffline 
                  ? (language === 'hi' ? 'ऑफ़लाइन होने पर टिप्पणी अक्षम है...' : 'Commenting is disabled offline...')
                  : (language === 'hi' ? 'अपनी टिप्पणी लिखें...' : 'Add a comment...')}
                placeholderTextColor={theme.textSecondary}
                value={newCommentText}
                onChangeText={setNewCommentText}
                multiline
                editable={!isOffline}
              />
              <Pressable
                onPress={handleSubmitComment}
                disabled={isOffline || !newCommentText.trim()}
                style={({ pressed }) => [
                  styles.commentSendBtn,
                  { backgroundColor: !isOffline && newCommentText.trim() ? theme.primary : theme.backgroundElement },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <SymbolView
                  name={{ ios: 'paperplane.fill', android: 'send', web: 'send' } as any}
                  size={16}
                  tintColor={!isOffline && newCommentText.trim() ? theme.onPrimary : theme.textSecondary}
                />
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* MODAL 0: CREATE ACTION CHOICE MENU */}
        <Modal visible={createActionMenuVisible} animationType="fade" transparent onRequestClose={() => setCreateActionMenuVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setCreateActionMenuVisible(false)}>
            <Animated.View entering={FadeInUp.duration(260)} style={[styles.actionChoiceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
                  <SymbolView
                    name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' } as any}
                    size={20}
                    tintColor={theme.primary}
                  />
                  <ThemedText type="smallBold" style={{ fontSize: 16, flex: 1 }} numberOfLines={1}>
                    {language === 'hi' ? 'क्या जोड़ना चाहते हैं?' : 'What would you like to create?'}
                  </ThemedText>
                </View>
                <Pressable onPress={() => setCreateActionMenuVisible(false)} hitSlop={8}>
                  <SymbolView
                    name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' } as any}
                    size={22}
                    tintColor={theme.textSecondary}
                  />
                </Pressable>
              </View>

              <View style={{ gap: Spacing.three, marginTop: Spacing.two }}>
                {/* Option 1: Create Post */}
                <Pressable
                  onPress={() => {
                    setCreateActionMenuVisible(false);
                    if (isOffline) {
                      Alert.alert(
                        language === 'hi' ? 'ऑफ़लाइन' : 'Offline',
                        language === 'hi' ? 'ऑफ़लाइन होने पर आप नई पोस्ट नहीं बना सकते।' : 'You cannot create a post while offline.'
                      );
                      return;
                    }
                    if (!selectedCommunity && communities.length > 0) {
                      setSelectedCommunity(communities[0]);
                    }
                    setPostTag(selectedCommunity?.category === 'machinery' ? '#Rent' : '#Question');
                    setActiveView('create-post');
                  }}
                  style={({ pressed }) => [
                    styles.actionChoiceBtn,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                    pressed && { opacity: 0.9, backgroundColor: theme.backgroundSelected }
                  ]}
                >
                  <View style={[styles.actionChoiceIconBg, { backgroundColor: theme.primary + '25' }]}>
                    <SymbolView
                      name={{ ios: 'square.and.pencil', android: 'edit', web: 'edit' } as any}
                      size={22}
                      tintColor={theme.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={{ fontSize: 15, color: theme.text }}>
                      {language === 'hi' ? 'नई पोस्ट साझा करें' : 'Create New Post'}
                    </ThemedText>
                    <ThemedText type="small" style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                      {language === 'hi' ? 'अपने प्रश्न, फोटो या उपकरण किराए के लिए पोस्ट करें' : 'Share questions, photos, or machinery for rent'}
                    </ThemedText>
                  </View>
                  <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                    size={18}
                    tintColor={theme.textSecondary}
                  />
                </Pressable>

                {/* Option 2: Create Board */}
                <Pressable
                  onPress={() => {
                    setCreateActionMenuVisible(false);
                    if (isOffline) {
                      Alert.alert(
                        language === 'hi' ? 'ऑफ़लाइन' : 'Offline',
                        language === 'hi' ? 'ऑफ़लाइन होने पर आप नई चौपाल नहीं बना सकते।' : 'You cannot create a new Chowpal board while offline.'
                      );
                      return;
                    }
                    setActiveView('create-community');
                  }}
                  style={({ pressed }) => [
                    styles.actionChoiceBtn,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                    pressed && { opacity: 0.9, backgroundColor: theme.backgroundSelected }
                  ]}
                >
                  <View style={[styles.actionChoiceIconBg, { backgroundColor: '#3B82F625' }]}>
                    <SymbolView
                      name={{ ios: 'rectangle.stack.badge.plus', android: 'groups', web: 'groups' } as any}
                      size={22}
                      tintColor="#3B82F6"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" style={{ fontSize: 15, color: theme.text }}>
                      {language === 'hi' ? 'नई चौपाल (Board) बनाएं' : 'Create New Chowpal Board'}
                    </ThemedText>
                    <ThemedText type="small" style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                      {language === 'hi' ? 'किसानों के लिए नया विषय चर्चा मंच शुरू करें' : 'Start a new topic forum community for farmers'}
                    </ThemedText>
                  </View>
                  <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                    size={18}
                    tintColor={theme.textSecondary}
                  />
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
        </Modal>

        {/* VIEW 4: CREATE COMMUNITY BOARD PAGE */}
        {activeView === 'create-community' && (
          <Animated.View entering={FadeInRight.duration(260)} style={{ flex: 1 }}>
            {/* Sub-Header */}
            <View style={styles.subPageHeader}>
              <Pressable
                onPress={() => setActiveView('main')}
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
                <ThemedText type="smallBold" style={{ fontSize: 18 }}>
                  {language === 'hi' ? 'नई चौपाल बनाएं' : 'Create New Chowpal'}
                </ThemedText>
                <ThemedText type="small" style={{ fontSize: 12, color: theme.textSecondary }}>
                  {language === 'hi' ? 'किसानों के लिए चर्चा मंच शुरू करें' : 'Start a community discussion forum for farmers'}
                </ThemedText>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.createPageFormContent} showsVerticalScrollIndicator={false}>
              <View style={[styles.createPageFormCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {/* Board Category */}
                <ThemedText type="smallBold" style={styles.formLabel}>
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
                            backgroundColor: isSelected ? (theme.dark ? '#064E3B' : '#ECFDF5') : (theme.dark ? '#18181B' : '#F8FAF8'),
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6
                          }
                        ]}
                      >
                        <SymbolView
                          name={getCategoryIcon(cat.key) as any}
                          size={13}
                          tintColor={isSelected ? (theme.dark ? '#34D399' : '#059669') : theme.textSecondary}
                        />
                        <ThemedText type="smallBold" style={{ color: isSelected ? (theme.dark ? '#34D399' : '#059669') : theme.text, fontSize: 13 }}>
                          {cat.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Name */}
                <ThemedText type="smallBold" style={styles.formLabel}>
                  {language === 'hi' ? 'चौपाल नाम (Name)' : 'BOARD NAME'}
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                  placeholder={language === 'hi' ? 'जैसे: टमाटर उत्पादक संघ या Tomato Farmers Hub' : 'e.g. Tomato Farmers Hub'}
                  value={commName}
                  onChangeText={setCommName}
                />

                {/* Description */}
                <ThemedText type="smallBold" style={styles.formLabel}>
                  {language === 'hi' ? 'विवरण (Description)' : 'BOARD DESCRIPTION'}
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement, height: 90 }]}
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
                    <ThemedText type="smallBold" style={{ color: theme.onPrimary, fontSize: 16 }}>
                      {language === 'hi' ? 'चौपाल बनाएं' : 'Create Chowpal'}
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* VIEW 5: CREATE POST PAGE */}
        {activeView === 'create-post' && (
          <Animated.View entering={FadeInRight.duration(260)} style={{ flex: 1 }}>
            {/* Sub-Header */}
            <View style={styles.subPageHeader}>
              <Pressable
                onPress={() => {
                  if (selectedCommunity) {
                    setActiveView('community-details');
                  } else {
                    setActiveView('main');
                  }
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
                <ThemedText type="smallBold" style={{ fontSize: 18 }}>
                  {language === 'hi' ? 'नई पोस्ट साझा करें' : 'Create New Post'}
                </ThemedText>
                {selectedCommunity && (
                  <ThemedText type="small" style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }} numberOfLines={1}>
                    {language === 'hi' ? 'चौपाल: ' : 'Board: '}{language === 'hi' ? selectedCommunity.name.hi : selectedCommunity.name.en}
                  </ThemedText>
                )}
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.createPageFormContent} showsVerticalScrollIndicator={false}>
              <View style={[styles.createPageFormCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {/* Selected Board Header Banner if available */}
                {selectedCommunity && (
                  <View style={[styles.commBannerPill, { backgroundColor: theme.backgroundSelected, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.three }]}>
                    <SymbolView
                      name={{ ios: 'megaphone.fill', android: 'campaign', web: 'campaign' } as any}
                      size={14}
                      tintColor={theme.primary}
                    />
                    <ThemedText type="smallBold" style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>
                      {language === 'hi' ? 'पोस्टिंग स्थान' : 'Posting in'}: {language === 'hi' ? selectedCommunity.name.hi : selectedCommunity.name.en}
                    </ThemedText>
                  </View>
                )}

                {/* Tag Selection */}
                <ThemedText type="smallBold" style={styles.formLabel}>
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
                            backgroundColor: isSelected ? (theme.dark ? '#064E3B' : '#ECFDF5') : (theme.dark ? '#18181B' : '#F8FAF8')
                          }
                        ]}
                      >
                        <ThemedText type="smallBold" style={{ color: isSelected ? (theme.dark ? '#34D399' : '#059669') : theme.text, fontSize: 13 }}>
                          {getLocalizedTag(t, language)}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Title */}
                <ThemedText type="smallBold" style={styles.formLabel}>
                  {language === 'hi' ? 'शीर्षक' : 'POST TITLE'}
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                  placeholder={language === 'hi' ? 'पोस्ट का मुख्य शीर्षक...' : 'Enter post title...'}
                  value={postTitle}
                  onChangeText={setPostTitle}
                />

                {/* Content */}
                <ThemedText type="smallBold" style={styles.formLabel}>
                  {language === 'hi' ? 'विवरण' : 'DETAILS / DESCRIPTION'}
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement, height: 120 }]}
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
                        <ThemedText type="smallBold" style={{ fontSize: 11, color: theme.textSecondary }}>
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
                        <ThemedText type="smallBold" style={{ fontSize: 11, color: theme.textSecondary }}>
                          {language === 'hi' ? 'इकाई (Unit)' : 'UNIT'}
                        </ThemedText>
                        <View style={{ flexDirection: 'row', gap: Spacing.one, marginTop: 4, height: 44 }}>
                          {['hour', 'day'].map(u => (
                            <Pressable
                              key={u}
                              onPress={() => setPostRentUnit(u as any)}
                              style={{
                                flex: 1,
                                borderWidth: 1,
                                borderColor: postRentUnit === u ? theme.primary : theme.border,
                                backgroundColor: postRentUnit === u ? theme.backgroundSelected : theme.card,
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <ThemedText type="smallBold" style={{ fontSize: 12 }}>
                                {language === 'hi' ? (u === 'hour' ? 'घंटा' : 'दिन') : u}
                              </ThemedText>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </View>

                    <ThemedText type="smallBold" style={{ fontSize: 11, color: theme.textSecondary }}>
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
                <ThemedText type="smallBold" style={styles.formLabel}>
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
                    <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 13 }}>
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
                    <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 13 }}>
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
                    <ThemedText type="smallBold" style={{ color: theme.onPrimary, fontSize: 16 }}>
                      {language === 'hi' ? 'पोस्ट साझा करें' : 'Publish Post'}
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        )}

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
  createPageFormContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
  },
  createPageFormCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
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
    paddingHorizontal: Spacing.one,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
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
    flexShrink: 0,
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
    ...Platform.select({
      web: {
        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
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
    ...Platform.select({
      web: {
        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      } as any,
    }),
  },
  modalCard: {
    width: '100%',
    maxWidth: MaxContentWidth,
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: Spacing.four,
    ...Platform.select({
      web: {
        boxShadow: '0 -10px 30px rgba(0,0,0,0.25)',
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 12,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.three,
  },
  modalForm: {
    paddingBottom: Spacing.six,
  },
  formLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: Spacing.four,
    marginBottom: 8,
  },
  commBannerPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: Spacing.two,
  },
  formInput: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.sans,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  formCategoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  formRentGroup: {
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: Spacing.three,
  },
  modalPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 120,
    height: 90,
    borderRadius: 12,
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
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.five,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
        cursor: 'pointer',
      } as any,
      default: {
        elevation: 4,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
    }),
  },
  redditCoverBanner: {
    height: 125,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  redditBackBtn: {
    position: 'absolute',
    top: 12,
    left: 16,
    zIndex: 9999,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
        cursor: 'pointer',
      } as any,
      default: {
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
    }),
  },
  redditBannerOverlay: {
    position: 'absolute',
    right: -10,
    bottom: -15,
  },
  redditProfileHeader: {
    paddingBottom: 4,
  },
  redditAvatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  redditAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3.5,
    marginTop: -34,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      } as any,
      default: {
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
    }),
  },
  redditJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 10,
  },
  redditStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  redditStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  redditStatDivider: {
    width: 1,
    height: 24,
  },
  redditSubTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: 14,
    gap: 24,
  },
  redditSubTabBtn: {
    paddingVertical: 10,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  floatingFabContainer: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    zIndex: 9999,
  },
  floatingBoardFab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 28,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px rgba(5, 150, 105, 0.45)',
        cursor: 'pointer',
        outlineStyle: 'none',
      } as any,
      default: {
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  floatingBoardFabPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.94 }],
  },
  floatingBoardFabText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  floatingPlusFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px rgba(5, 150, 105, 0.45)',
        cursor: 'pointer',
        outlineStyle: 'none',
      } as any,
      default: {
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  actionChoiceCard: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Platform.OS === 'web' ? Spacing.five : Spacing.six,
    borderWidth: 1,
    borderBottomWidth: 0,
    ...Platform.select({
      web: {
        boxShadow: '0 -10px 30px rgba(0,0,0,0.3)',
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 12,
      },
    }),
  },
  actionChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionChoiceIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
