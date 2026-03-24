import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Image, ActivityIndicator, Dimensions, Animated,
  TextInput, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const NUM_COLS = width > 600 ? 4 : 3;
const CARD_WIDTH = (width - 32 - (NUM_COLS - 1) * 10) / NUM_COLS;

interface Movie {
  id: number;
  title: string;
  original_title: string;
  poster: string;
  backdrop: string;
  overview: string;
  rating: number;
  release_date: string;
}

interface Genre {
  id: number;
  name: string;
}

export default function MoviesScreen() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetchMovies(1);
    fetchGenres();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const fetchGenres = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/movies/genres`);
      const data = await res.json();
      setGenres(data.genres || []);
    } catch (e) {}
  };

  const fetchMovies = async (pg: number, append = false) => {
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await fetch(`${BACKEND}/api/movies/popular?page=${pg}`);
      const data = await res.json();
      const newMovies = data.movies || [];
      setTotalPages(data.total_pages || 1);
      if (append) setMovies(prev => [...prev, ...newMovies]);
      else setMovies(newMovies);
    } catch (e) {
      if (!append) setMovies([]);
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
      fetchMovies(1);
      return;
    }
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND}/api/movies/search?query=${encodeURIComponent(text)}`);
        const data = await res.json();
        setMovies(data.movies || []);
      } catch (e) {
        setMovies([]);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const handleLoadMore = () => {
    if (!loadingMore && !isSearching && page < totalPages) {
      const next = page + 1;
      setPage(next);
      fetchMovies(next, true);
    }
  };

  const handleMoviePress = async (movie: Movie) => {
    try {
      await fetch(`${BACKEND}/api/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: String(movie.id),
          item_type: 'movie',
          name: movie.title,
          logo: movie.poster,
          stream_url: '',
          metadata: { rating: movie.rating, overview: movie.overview, release_date: movie.release_date },
        }),
      });
    } catch (e) {}
  };

  const renderMovie = useCallback(({ item }: { item: Movie }) => (
    <TouchableOpacity
      testID={`movie-card-${item.id}`}
      style={styles.card}
      onPress={() => {}}
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
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.cardMeta}>
          <Ionicons name="star" size={11} color="#FFD700" />
          <Text style={styles.cardRating}>{item.rating.toFixed(1)}</Text>
        </View>
      </View>
      <TouchableOpacity
        testID={`fav-movie-${item.id}`}
        style={styles.favBtn}
        onPress={() => handleMoviePress(item)}
      >
        <Ionicons name="heart-outline" size={16} color="#E50914" />
      </TouchableOpacity>
    </TouchableOpacity>
  ), []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#6B7280" style={{ marginLeft: 8 }} />
          <TextInput
            testID="movies-search-input"
            style={styles.searchInput}
            placeholder="ابحث عن فيلم..."
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
        <Text style={styles.headerTitle}>أفلام</Text>
      </Animated.View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>جاري تحميل الأفلام...</Text>
        </View>
      ) : movies.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="film-outline" size={56} color="#374151" />
          <Text style={styles.emptyText}>لا توجد أفلام</Text>
        </View>
      ) : (
        <FlatList
          data={movies}
          renderItem={renderMovie}
          keyExtractor={(item) => String(item.id)}
          numColumns={NUM_COLS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#E50914" style={{ padding: 16 }} /> : null}
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
  poster: {
    width: '100%',
    height: CARD_WIDTH * 1.5,
    backgroundColor: '#1F2937',
  },
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
  cardMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3 },
  cardRating: { fontSize: 11, color: '#9CA3AF' },
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
