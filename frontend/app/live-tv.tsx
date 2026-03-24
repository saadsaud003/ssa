import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Image, ActivityIndicator, TextInput, ScrollView,
  Dimensions, Animated, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';

const { width } = Dimensions.get('window');
const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Channel {
  id: string;
  name: string;
  logo: string;
  category: string;
  country: string;
  stream_url: string;
  is_arabic: boolean;
}

interface Category {
  id: string;
  name: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'الكل',
  news: 'أخبار',
  sports: 'رياضة',
  entertainment: 'ترفيه',
  movies: 'أفلام',
  music: 'موسيقى',
  kids: 'أطفال',
  documentary: 'وثائقي',
  religious: 'ديني',
  general: 'عام',
  business: 'أعمال',
};

export default function LiveTVScreen() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [filtered, setFiltered] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([{ id: 'all', name: 'الكل' }]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<{ loaded: boolean; count: number }>({ loaded: false, count: 0 });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(
    selectedChannel ? { uri: selectedChannel.stream_url } : null,
    (p) => { if (selectedChannel) p.play(); }
  );

  useEffect(() => {
    fetchStatus();
    fetchCategories();
    fetchChannels(1, 'all', '');
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      player.replace({ uri: selectedChannel.stream_url });
      player.play();
    }
  }, [selectedChannel]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/channels/status`);
      const data = await res.json();
      setStatus(data);
    } catch (e) {}
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/channels/categories`);
      const data = await res.json();
      const cats = [{ id: 'all', name: 'الكل' }, ...data.categories.slice(0, 12)];
      setCategories(cats);
    } catch (e) {}
  };

  const fetchChannels = async (pg: number, cat: string, q: string, append = false) => {
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      let url = `${BACKEND}/api/channels?page=${pg}&limit=60&arabic_only=true`;
      if (cat !== 'all') url += `&category=${cat}`;
      if (q) url += `&search=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const data = await res.json();
      setTotal(data.total || 0);
      if (append) {
        setChannels(prev => [...prev, ...(data.channels || [])]);
        setFiltered(prev => [...prev, ...(data.channels || [])]);
      } else {
        setChannels(data.channels || []);
        setFiltered(data.channels || []);
        if (data.channels?.length > 0 && !selectedChannel) {
          setSelectedChannel(data.channels[0]);
        }
      }
    } catch (e) {
      setChannels([]);
      setFiltered([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleCategorySelect = (catId: string) => {
    setSelectedCat(catId);
    setPage(1);
    fetchChannels(1, catId, search);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    setPage(1);
    fetchChannels(1, selectedCat, text);
  };

  const handleLoadMore = () => {
    if (!loadingMore && channels.length < total) {
      const next = page + 1;
      setPage(next);
      fetchChannels(next, selectedCat, search, true);
    }
  };

  const renderChannel = useCallback(({ item, index }: { item: Channel; index: number }) => {
    const isSelected = selectedChannel?.id === item.id;
    return (
      <TouchableOpacity
        testID={`channel-item-${item.id}`}
        style={[styles.channelItem, isSelected && styles.channelItemActive]}
        onPress={() => setSelectedChannel(item)}
        activeOpacity={0.7}
      >
        <View style={styles.channelNum}>
          <Text style={styles.channelNumText}>{index + 1}</Text>
        </View>
        {item.logo ? (
          <Image
            source={{ uri: item.logo }}
            style={styles.channelLogo}
            resizeMode="contain"
            defaultSource={require('../assets/images/icon.png')}
          />
        ) : (
          <View style={styles.channelLogoPlaceholder}>
            <Ionicons name="tv-outline" size={20} color="#6B7280" />
          </View>
        )}
        <View style={styles.channelInfo}>
          <Text style={styles.channelName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.channelCat}>{CATEGORY_LABELS[item.category] || item.category}</Text>
        </View>
        {isSelected && <View style={styles.liveIndicator}><Text style={styles.liveText}>مباشر</Text></View>}
      </TouchableOpacity>
    );
  }, [selectedChannel]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#6B7280" style={{ marginLeft: 8 }} />
          <TextInput
            testID="search-input"
            style={styles.searchInput}
            placeholder="ابحث عن قناة..."
            placeholderTextColor="#6B7280"
            value={search}
            onChangeText={handleSearch}
            textAlign="right"
          />
          {search ? (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color="#6B7280" />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.headerTitle}>البث المباشر</Text>
      </Animated.View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catContent}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            testID={`cat-tab-${cat.id}`}
            style={[styles.catTab, selectedCat === cat.id && styles.catTabActive]}
            onPress={() => handleCategorySelect(cat.id)}
          >
            <Text style={[styles.catTabText, selectedCat === cat.id && styles.catTabTextActive]}>
              {CATEGORY_LABELS[cat.id] || cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main Content */}
      <View style={styles.main}>
        {/* Left: Mini Player */}
        <View style={styles.playerPanel}>
          {selectedChannel ? (
            <View style={styles.playerWrap}>
              <VideoView
                testID="mini-player"
                style={styles.videoView}
                player={player}
                contentFit="contain"
                nativeControls={false}
              />
              <LinearOverlay />
            </View>
          ) : (
            <View style={styles.playerPlaceholder}>
              <Ionicons name="tv-outline" size={48} color="#374151" />
              <Text style={styles.placeholderText}>اختر قناة للمشاهدة</Text>
            </View>
          )}

          {selectedChannel && (
            <View style={styles.channelNowInfo}>
              <Text style={styles.channelNowName} numberOfLines={1}>{selectedChannel.name}</Text>
              <View style={styles.playerActions}>
                <TouchableOpacity
                  testID="fullscreen-btn"
                  style={styles.playerActionBtn}
                  onPress={() => router.push({
                    pathname: '/player',
                    params: { url: selectedChannel.stream_url, name: selectedChannel.name, logo: selectedChannel.logo }
                  })}
                >
                  <Ionicons name="expand-outline" size={20} color="#00D4FF" />
                  <Text style={styles.playerActionText}>ملء الشاشة</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="add-favorite-btn"
                  style={styles.playerActionBtn}
                  onPress={() => addToFavorites(selectedChannel)}
                >
                  <Ionicons name="heart-outline" size={20} color="#E50914" />
                  <Text style={styles.playerActionText}>المفضلة</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Status bar */}
          {!status.loaded && (
            <View style={styles.statusBanner}>
              <ActivityIndicator size="small" color="#00D4FF" />
              <Text style={styles.statusText}>جاري تحميل قائمة القنوات...</Text>
            </View>
          )}
          {status.loaded && (
            <View style={styles.statusBannerDone}>
              <Ionicons name="checkmark-circle" size={14} color="#00D4FF" />
              <Text style={styles.statusTextDone}>{status.count.toLocaleString()} قناة متاحة</Text>
            </View>
          )}
        </View>

        {/* Right: Channel List */}
        <View style={styles.channelPanel}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#00D4FF" />
              <Text style={styles.loadingText}>جاري تحميل القنوات...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="tv-outline" size={48} color="#374151" />
              <Text style={styles.emptyText}>لا توجد قنوات</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              renderItem={renderChannel}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#00D4FF" style={{ padding: 12 }} /> : null}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

async function addToFavorites(channel: Channel) {
  try {
    const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';
    const res = await fetch(`${BACKEND}/api/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: channel.id,
        item_type: 'channel',
        name: channel.name,
        logo: channel.logo,
        stream_url: channel.stream_url,
      }),
    });
    const data = await res.json();
    if (data.already_exists) {
      Alert.alert('المفضلة', 'القناة موجودة بالفعل في المفضلة');
    } else {
      Alert.alert('المفضلة', `تمت إضافة "${channel.name}" إلى المفضلة ✓`);
    }
  } catch (e) {
    Alert.alert('خطأ', 'تعذر الإضافة إلى المفضلة');
  }
}

function LinearOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.overlayBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    writingDirection: 'rtl',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#151B2B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    marginHorizontal: 8,
    writingDirection: 'rtl',
  },
  catScroll: { maxHeight: 48, backgroundColor: '#0D1220' },
  catContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row-reverse',
  },
  catTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#151B2B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  catTabActive: {
    backgroundColor: '#00D4FF',
    borderColor: '#00D4FF',
  },
  catTabText: { fontSize: 13, color: '#9CA3AF', writingDirection: 'rtl' },
  catTabTextActive: { color: '#000000', fontWeight: '600' },
  main: { flex: 1, flexDirection: 'row-reverse' },
  playerPanel: {
    width: width * 0.42,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#0D1220',
  },
  playerWrap: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  videoView: { flex: 1, width: '100%', height: '100%' },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  playerPlaceholder: {
    aspectRatio: 16 / 9,
    backgroundColor: '#0D1220',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: { color: '#374151', fontSize: 13, writingDirection: 'rtl' },
  channelNowInfo: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  channelNowName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  playerActions: { flexDirection: 'row-reverse', gap: 8 },
  playerActionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  playerActionText: { fontSize: 12, color: '#9CA3AF', writingDirection: 'rtl' },
  statusBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: 'rgba(0,212,255,0.06)',
    margin: 8,
    borderRadius: 8,
  },
  statusText: { fontSize: 12, color: '#9CA3AF', writingDirection: 'rtl' },
  statusBannerDone: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    margin: 8,
  },
  statusTextDone: { fontSize: 12, color: '#00D4FF', writingDirection: 'rtl' },
  channelPanel: { flex: 1, backgroundColor: '#0A0E1A' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#6B7280', fontSize: 14, writingDirection: 'rtl' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: '#6B7280', fontSize: 14, writingDirection: 'rtl' },
  channelItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 10,
  },
  channelItemActive: {
    backgroundColor: 'rgba(0,212,255,0.08)',
    borderRightWidth: 3,
    borderRightColor: '#00D4FF',
  },
  channelNum: {
    width: 28,
    alignItems: 'center',
  },
  channelNumText: { fontSize: 11, color: '#6B7280' },
  channelLogo: {
    width: 50,
    height: 34,
    borderRadius: 4,
    backgroundColor: '#151B2B',
  },
  channelLogoPlaceholder: {
    width: 50,
    height: 34,
    borderRadius: 4,
    backgroundColor: '#151B2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelInfo: { flex: 1 },
  channelName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E5E7EB',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  channelCat: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 2,
    writingDirection: 'rtl',
  },
  liveIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#E50914',
  },
  liveText: { fontSize: 10, color: '#FFFFFF', fontWeight: 'bold' },
});
