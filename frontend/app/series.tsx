import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Image, ActivityIndicator, Dimensions, Animated, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const NUM_COLS = width > 600 ? 4 : 3;
const CARD_WIDTH = (width - 32 - (NUM_COLS - 1) * 10) / NUM_COLS;

interface Series {
  id: number;
  name: string;
  original_name: string;
  poster: string;
  backdrop: string;
  overview: string;
  rating: number;
  first_air_date: string;
}

export default function SeriesScreen() {
  const router = useRouter();
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetchSeries(1);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const fetchSeries = async (pg: number, append = false) => {
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await fetch(`${BACKEND}/api/series/popular?page=${pg}`);
      const data = await res.json();
      const newSeries = data.series || [];
      setTotalPages(data.total_pages || 1);
      if (append) setSeries(prev => [...prev, ...newSeries]);
      else setSeries(newSeries);
    } catch (e) {
      if (!append) setSeries([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    clearTimeout(searchTimeout.current);
    if (!text.trim()) {
      setIsSearching(false);
      fetchSeries(1);
      return;
    }
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND}/api/series/search?query=${encodeURIComponent(text)}`);
        const data = await res.json();
        setSeries(data.series || []);
      } catch (e) {
        setSeries([]);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const handleLoadMore = () => {
    if (!loadingMore && !isSearching && page < totalPages) {
      const next = page + 1;
      setPage(next);
      fetchSeries(next, true);
    }
  };

  const addToFavorites = async (s: Series) => {
    try {
      await fetch(`${BACKEND}/api/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: String(s.id),
          item_type: 'series',
          name: s.name,
          logo: s.poster,
          stream_url: '',
          metadata: { rating: s.rating, overview: s.overview, first_air_date: s.first_air_date },
        }),
      });
    } catch (e) {}
  };

  const renderSeries = useCallback(({ item }: { item: Series }) => (
    <TouchableOpacity
      testID={`series-card-${item.id}`}
      style={styles.card}
      activeOpacity={0.8}
    >
      {item.poster ? (
        <Image source={{ uri: item.poster }} style={styles.poster} resizeMode="cover" />
      ) : (
        <View style={styles.posterPlaceholder}>
          <Ionicons name="film-outline" size={32} color="#374151" />
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
        <View style={styles.cardMeta}>
          <Ionicons name="star" size={11} color="#FFD700" />
          <Text style={styles.cardRating}>{item.rating.toFixed(1)}</Text>
          {item.first_air_date && (
            <Text style={styles.cardYear}>{item.first_air_date.substring(0, 4)}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        testID={`fav-series-${item.id}`}
        style={styles.favBtn}
        onPress={() => addToFavorites(item)}
      >
        <Ionicons name="heart-outline" size={16} color="#A855F7" />
      </TouchableOpacity>
    </TouchableOpacity>
  ), []);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#6B7280" style={{ marginLeft: 8 }} />
          <TextInput
            testID="series-search-input"
            style={styles.searchInput}
            placeholder="ابحث عن مسلسل..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={handleSearch}
            textAlign="right"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={16} color="#6B7280" />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.headerTitle}>مسلسلات</Text>
      </Animated.View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={styles.loadingText}>جاري تحميل المسلسلات...</Text>
        </View>
      ) : series.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="film-outline" size={56} color="#374151" />
          <Text style={styles.emptyText}>لا توجد مسلسلات</Text>
        </View>
      ) : (
        <FlatList
          data={series}
          renderItem={renderSeries}
          keyExtractor={(item) => String(item.id)}
          numColumns={NUM_COLS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#A855F7" style={{ padding: 16 }} /> : null}
        />
      )}
    </SafeAreaView>
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
  searchWrap: {
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
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#6B7280', fontSize: 14, writingDirection: 'rtl' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: '#6B7280', fontSize: 16, writingDirection: 'rtl' },
  grid: { padding: 16 },
  row: { gap: 10, marginBottom: 10, flexDirection: 'row-reverse' },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#151B2B',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  poster: { width: '100%', height: CARD_WIDTH * 1.5, backgroundColor: '#1F2937' },
  posterPlaceholder: {
    width: '100%',
    height: CARD_WIDTH * 1.5,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { padding: 8 },
  cardTitle: {
    fontSize: 12,
    color: '#E5E7EB',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 4,
  },
  cardMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  cardRating: { fontSize: 11, color: '#9CA3AF' },
  cardYear: { fontSize: 10, color: '#6B7280' },
  favBtn: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
