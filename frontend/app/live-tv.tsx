import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Image, ActivityIndicator, TextInput,
  Dimensions, Animated, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';

const { width, height } = Dimensions.get('window');
const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const PLAYER_W = Math.round(width * 0.40);

interface Channel {
  id: string; name: string; arabic_name?: string;
  logo: string; category: string; country: string; stream_url: string;
}

const CAT_LABELS: Record<string, string> = {
  all: 'الكل', news: 'أخبار', sports: 'رياضة', entertainment: 'ترفيه',
  movies: 'أفلام', music: 'موسيقى', kids: 'أطفال', documentary: 'وثائقي',
  religious: 'ديني', general: 'عام', business: 'أعمال', food: 'طبخ',
  culture: 'ثقافة', family: 'عائلة',
};

function ChannelLogo({ uri, size = 44 }: { uri: string; size?: number }) {
  const [error, setError] = useState(false);
  if (!uri || error) {
    return (
      <View style={{ width: size, height: size, borderRadius: 6, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="tv-outline" size={size * 0.45} color="#6B7280" />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size * 0.68, borderRadius: 6, backgroundColor: '#1F2937' }}
      resizeMode="contain"
      onError={() => setError(true)}
    />
  );
}

export default function LiveTVScreen() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const CATS = [
    { id: 'all', label: 'الكل' }, { id: 'news', label: 'أخبار' },
    { id: 'sports', label: 'رياضة' }, { id: 'entertainment', label: 'ترفيه' },
    { id: 'movies', label: 'أفلام' }, { id: 'music', label: 'موسيقى' },
    { id: 'kids', label: 'أطفال' }, { id: 'religious', label: 'ديني' },
    { id: 'documentary', label: 'وثائقي' },
  ];

  const player = useVideoPlayer(
    selectedChannel ? { uri: selectedChannel.stream_url } : null,
    (p) => { if (selectedChannel) p.play(); }
  );

  useEffect(() => {
    fetchChannels(1, 'all', '');
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      player.replace({ uri: selectedChannel.stream_url });
      player.play();
      setIsFav(false);
    }
  }, [selectedChannel?.id]);

  const fetchChannels = async (pg: number, cat: string, q: string, append = false) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      let url = `${BACKEND}/api/channels?page=${pg}&limit=50&arabic_only=true`;
      if (cat !== 'all') url += `&category=${cat}`;
      if (q) url += `&search=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const data = await res.json();
      setTotal(data.total || 0);
      const list = data.channels || [];
      if (append) setChannels(prev => [...prev, ...list]);
      else {
        setChannels(list);
        if (list.length > 0 && !selectedChannel) setSelectedChannel(list[0]);
      }
    } catch (e) { if (!append) setChannels([]); }
    finally { setLoading(false); setLoadingMore(false); }
  };

  const handleCatSelect = (id: string) => {
    setSelectedCat(id); setPage(1);
    fetchChannels(1, id, search);
  };

  const handleSearch = (t: string) => {
    setSearch(t); setPage(1);
    fetchChannels(1, selectedCat, t);
  };

  const handleLoadMore = () => {
    if (!loadingMore && channels.length < total) {
      const next = page + 1; setPage(next);
      fetchChannels(next, selectedCat, search, true);
    }
  };

  const toggleFav = async () => {
    if (!selectedChannel) return;
    if (isFav) {
      await fetch(`${BACKEND}/api/favorites/${encodeURIComponent(selectedChannel.id)}`, { method: 'DELETE' });
      setIsFav(false);
      Alert.alert('المفضلة', 'تم الحذف من المفضلة');
    } else {
      const res = await fetch(`${BACKEND}/api/favorites`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: selectedChannel.id, item_type: 'channel', name: selectedChannel.arabic_name || selectedChannel.name, logo: selectedChannel.logo, stream_url: selectedChannel.stream_url }),
      });
      const data = await res.json();
      setIsFav(!data.already_exists);
      Alert.alert('المفضلة', data.already_exists ? 'موجود بالفعل' : `تمت إضافة "${selectedChannel.arabic_name || selectedChannel.name}" ✓`);
    }
  };

  const renderChannel = useCallback(({ item, index }: { item: Channel; index: number }) => {
    const active = selectedChannel?.id === item.id;
    const displayName = item.arabic_name || item.name;
    return (
      <TouchableOpacity
        testID={`channel-item-${item.id}`}
        style={[styles.channelItem, active && styles.channelItemActive]}
        onPress={() => setSelectedChannel(item)}
        activeOpacity={0.7}
      >
        <ChannelLogo uri={item.logo} size={46} />
        <View style={styles.chInfo}>
          <Text style={styles.chName} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.chCat}>{CAT_LABELS[item.category] || item.category}</Text>
        </View>
        {active ? (
          <View style={styles.liveTag}><Text style={styles.liveTagText}>▶ مباشر</Text></View>
        ) : (
          <Text style={styles.chNum}>{index + 1}</Text>
        )}
      </TouchableOpacity>
    );
  }, [selectedChannel]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-forward" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <TextInput
            testID="search-input"
            style={styles.searchInput}
            placeholder="ابحث في القنوات..."
            placeholderTextColor="#6B7280"
            value={search}
            onChangeText={handleSearch}
            textAlign="right"
          />
          <Ionicons name="search-outline" size={16} color="#6B7280" />
        </View>
        <Text style={styles.headerTitle}>البث المباشر</Text>
      </View>

      {/* Main Row: Player LEFT + Channel Panel RIGHT */}
      <Animated.View style={[styles.mainRow, { opacity: fadeAnim }]}>

        {/* LEFT: Video Player */}
        <View style={styles.playerPanel}>
          {selectedChannel ? (
            <>
              <View style={styles.playerWrap}>
                <VideoView
                  testID="mini-player"
                  style={StyleSheet.absoluteFill}
                  player={player}
                  contentFit="contain"
                  nativeControls={false}
                />
                <View style={styles.liveOverlay}>
                  <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>● مباشر</Text></View>
                </View>
              </View>
              <View style={styles.playerInfo}>
                <Text style={styles.playerChName} numberOfLines={1}>
                  {selectedChannel.arabic_name || selectedChannel.name}
                </Text>
                <View style={styles.playerBtns}>
                  <TouchableOpacity testID="fullscreen-btn" style={styles.playerBtn}
                    onPress={() => router.push({ pathname: '/player', params: { url: selectedChannel.stream_url, name: selectedChannel.arabic_name || selectedChannel.name, logo: selectedChannel.logo } })}>
                    <Ionicons name="expand-outline" size={18} color="#00D4FF" />
                    <Text style={styles.playerBtnText}>ملء الشاشة</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID="fav-btn" style={styles.playerBtn} onPress={toggleFav}>
                    <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={18} color="#E50914" />
                    <Text style={styles.playerBtnText}>المفضلة</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.playerPlaceholder}>
              <Ionicons name="tv-outline" size={50} color="#374151" />
              <Text style={styles.placeholderTxt}>اختر قناة للمشاهدة</Text>
            </View>
          )}
        </View>

        {/* RIGHT: Channel List + Category Sidebar */}
        <View style={styles.channelPanel}>

          {/* Channel List */}
          <View style={styles.channelListWrap}>
            {loading ? (
              <View style={styles.centerWrap}>
                <ActivityIndicator size="large" color="#E50914" />
                <Text style={styles.loadTxt}>جاري التحميل...</Text>
              </View>
            ) : channels.length === 0 ? (
              <View style={styles.centerWrap}>
                <Ionicons name="tv-outline" size={40} color="#374151" />
                <Text style={styles.loadTxt}>لا توجد قنوات</Text>
              </View>
            ) : (
              <FlatList
                data={channels}
                renderItem={renderChannel}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#E50914" style={{ padding: 12 }} /> : null}
              />
            )}
          </View>

          {/* RIGHT Category Sidebar */}
          <View style={styles.catSidebar}>
            <FlatList
              data={CATS}
              keyExtractor={i => i.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  testID={`cat-${item.id}`}
                  style={[styles.catItem, selectedCat === item.id && styles.catItemActive]}
                  onPress={() => handleCatSelect(item.id)}
                >
                  <Text style={[styles.catItemText, selectedCat === item.id && styles.catItemTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0A0A0A', gap: 8,
  },
  iconBtn: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF', writingDirection: 'rtl' },
  searchBar: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: '#1a1a1a', borderRadius: 10, paddingHorizontal: 10,
    paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 6,
  },
  searchInput: { flex: 1, color: '#FFF', fontSize: 13, writingDirection: 'rtl' },
  mainRow: { flex: 1, flexDirection: 'row' },

  /* Player Panel - LEFT */
  playerPanel: {
    width: PLAYER_W, backgroundColor: '#0A0A0A',
    borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.07)',
  },
  playerWrap: {
    width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', overflow: 'hidden',
  },
  liveOverlay: {
    position: 'absolute', top: 8, right: 8,
  },
  liveBadge: {
    backgroundColor: '#E50914', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5,
  },
  liveBadgeText: { fontSize: 10, color: '#FFF', fontWeight: 'bold' },
  playerInfo: { padding: 10 },
  playerChName: {
    fontSize: 14, fontWeight: 'bold', color: '#FFF', textAlign: 'right',
    writingDirection: 'rtl', marginBottom: 8,
  },
  playerBtns: { flexDirection: 'row-reverse', gap: 8 },
  playerBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  playerBtnText: { fontSize: 11, color: '#9CA3AF', writingDirection: 'rtl' },
  playerPlaceholder: {
    aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#111', gap: 8,
  },
  placeholderTxt: { color: '#374151', fontSize: 12, writingDirection: 'rtl' },

  /* Channel Panel - RIGHT */
  channelPanel: { flex: 1, flexDirection: 'row' },
  channelListWrap: { flex: 1 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadTxt: { color: '#6B7280', fontSize: 13, writingDirection: 'rtl' },

  /* Category Sidebar */
  catSidebar: {
    width: 72, backgroundColor: '#0D0D0D',
    borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.07)',
  },
  catItem: {
    paddingVertical: 12, paddingHorizontal: 6,
    alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  catItemActive: { backgroundColor: 'rgba(229,9,20,0.15)', borderRightWidth: 3, borderRightColor: '#E50914' },
  catItemText: { fontSize: 11, color: '#6B7280', textAlign: 'center', writingDirection: 'rtl' },
  catItemTextActive: { color: '#E50914', fontWeight: '700' },

  /* Channel Item */
  channelItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 8,
  },
  channelItemActive: { backgroundColor: 'rgba(229,9,20,0.1)', borderRightWidth: 3, borderRightColor: '#E50914' },
  chInfo: { flex: 1 },
  chName: { fontSize: 13, fontWeight: '600', color: '#E5E7EB', textAlign: 'right', writingDirection: 'rtl' },
  chCat: { fontSize: 10, color: '#6B7280', textAlign: 'right', marginTop: 2, writingDirection: 'rtl' },
  liveTag: { backgroundColor: '#E50914', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  liveTagText: { fontSize: 9, color: '#FFF', fontWeight: 'bold' },
  chNum: { fontSize: 11, color: '#6B7280', width: 22, textAlign: 'center' },
});
