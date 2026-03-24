import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Image, ActivityIndicator, Dimensions, Animated,
  TextInput, ScrollView, Modal, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const NUM_COLS = width > 600 ? 4 : 3;
const CARD_WIDTH = (width - 32 - (NUM_COLS - 1) * 10) / NUM_COLS;

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i);

const SORT_OPTIONS = [
  { id: 'popularity.desc', label: 'الأكثر شعبية' },
  { id: 'vote_average.desc', label: 'الأعلى تقييماً' },
  { id: 'primary_release_date.desc', label: 'الأحدث' },
  { id: 'revenue.desc', label: 'الأعلى إيرادات' },
];

interface Movie {
  id: number;
  title: string;
  original_title: string;
  poster: string;
  backdrop: string;
  overview: string;
  rating: number;
  release_date: string;
  genre_ids: number[];
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

  // Filter state
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSort, setSelectedSort] = useState('popularity.desc');
  const [showFilters, setShowFilters] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const filterAnim = useRef(new Animated.Value(0)).current;

  const isFiltering = selectedGenre !== null || selectedYear !== null || selectedSort !== 'popularity.desc';

  useEffect(() => {
    fetchGenres();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!isSearching) {
      setPage(1);
      fetchData(1, false);
    }
  }, [selectedGenre, selectedYear, selectedSort]);

  useEffect(() => {
    Animated.timing(filterAnim, {
      toValue: showFilters ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [showFilters]);

  const fetchGenres = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/movies/genres`);
      const data = await res.json();
      setGenres(data.genres || []);
    } catch (e) {}
  };

  const fetchData = async (pg: number, append = false) => {
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      let url: string;
      if (isFiltering || pg > 1 && (selectedGenre || selectedYear || selectedSort !== 'popularity.desc')) {
        const params = new URLSearchParams({ page: String(pg), sort_by: selectedSort });
        if (selectedGenre) params.append('genre', String(selectedGenre));
        if (selectedYear) params.append('year', String(selectedYear));
        url = `${BACKEND}/api/movies/discover?${params.toString()}`;
      } else {
        url = `${BACKEND}/api/movies/popular?page=${pg}`;
      }
      const res = await fetch(url);
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
      setPage(1);
      fetchData(1, false);
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
      fetchData(next, true);
    }
  };

  const clearFilters = () => {
    setSelectedGenre(null);
    setSelectedYear(null);
    setSelectedSort('popularity.desc');
  };

  const activeFilterCount = (selectedGenre ? 1 : 0) + (selectedYear ? 1 : 0) + (selectedSort !== 'popularity.desc' ? 1 : 0);

  const renderMovie = useCallback(({ item }: { item: Movie }) => (
    <TouchableOpacity
      testID={`movie-card-${item.id}`}
      style={styles.card}
      onPress={() => router.push({ pathname: '/webplayer', params: { type: 'movie', id: String(item.id), name: item.title } })}
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
          {item.release_date ? (
            <Text style={styles.cardYear}>{item.release_date.substring(0, 4)}</Text>
          ) : null}
        </View>
      </View>
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
        <TouchableOpacity
          testID="filter-toggle-btn"
          style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options-outline" size={20} color={showFilters ? '#FFF' : '#9CA3AF'} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>أفلام</Text>
      </Animated.View>

      {/* Filter Section */}
      <Animated.View style={[styles.filterSection, {
        maxHeight: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 300] }),
        opacity: filterAnim,
      }]}>
        {/* Genre Chips */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>التصنيف</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            <TouchableOpacity
              testID="genre-all"
              style={[styles.chip, !selectedGenre && styles.chipActive]}
              onPress={() => setSelectedGenre(null)}
            >
              <Text style={[styles.chipText, !selectedGenre && styles.chipTextActive]}>الكل</Text>
            </TouchableOpacity>
            {genres.map(g => (
              <TouchableOpacity
                key={g.id}
                testID={`genre-${g.id}`}
                style={[styles.chip, selectedGenre === g.id && styles.chipActive]}
                onPress={() => setSelectedGenre(selectedGenre === g.id ? null : g.id)}
              >
                <Text style={[styles.chipText, selectedGenre === g.id && styles.chipTextActive]}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Year + Sort Row */}
        <View style={styles.filterRow}>
          {/* Year Selector */}
          <TouchableOpacity
            testID="year-picker-btn"
            style={[styles.filterSelectBtn, selectedYear && styles.filterSelectBtnActive]}
            onPress={() => setShowYearPicker(true)}
          >
            <Ionicons name="calendar-outline" size={16} color={selectedYear ? '#FFF' : '#9CA3AF'} />
            <Text style={[styles.filterSelectText, selectedYear && styles.filterSelectTextActive]}>
              {selectedYear ? String(selectedYear) : 'السنة'}
            </Text>
            {selectedYear && (
              <TouchableOpacity onPress={() => setSelectedYear(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={14} color="#FFF" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Sort Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flex: 1 }}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                testID={`sort-${opt.id}`}
                style={[styles.sortChip, selectedSort === opt.id && styles.sortChipActive]}
                onPress={() => setSelectedSort(opt.id)}
              >
                <Text style={[styles.sortChipText, selectedSort === opt.id && styles.sortChipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Clear Filters */}
        {isFiltering && (
          <TouchableOpacity testID="clear-filters-btn" style={styles.clearBtn} onPress={clearFilters}>
            <Ionicons name="refresh-outline" size={14} color="#E50914" />
            <Text style={styles.clearBtnText}>مسح الفلاتر</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Active Filters Summary (when filter panel is closed) */}
      {!showFilters && isFiltering && (
        <View style={styles.activeFilterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFilterScroll}>
            {selectedGenre && (
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>{genres.find(g => g.id === selectedGenre)?.name}</Text>
                <TouchableOpacity onPress={() => setSelectedGenre(null)}>
                  <Ionicons name="close" size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
            {selectedYear && (
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>{selectedYear}</Text>
                <TouchableOpacity onPress={() => setSelectedYear(null)}>
                  <Ionicons name="close" size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
            {selectedSort !== 'popularity.desc' && (
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>{SORT_OPTIONS.find(s => s.id === selectedSort)?.label}</Text>
                <TouchableOpacity onPress={() => setSelectedSort('popularity.desc')}>
                  <Ionicons name="close" size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.clearAllTag} onPress={clearFilters}>
              <Text style={styles.clearAllTagText}>مسح الكل</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>جاري تحميل الأفلام...</Text>
        </View>
      ) : movies.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="film-outline" size={56} color="#374151" />
          <Text style={styles.emptyText}>لا توجد أفلام</Text>
          {isFiltering && (
            <TouchableOpacity style={styles.emptyResetBtn} onPress={clearFilters}>
              <Text style={styles.emptyResetText}>مسح الفلاتر والمحاولة مجدداً</Text>
            </TouchableOpacity>
          )}
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

      {/* Year Picker Modal */}
      <Modal visible={showYearPicker} transparent animationType="fade" onRequestClose={() => setShowYearPicker(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowYearPicker(false)} />
          <View style={styles.yearPickerContainer}>
            <View style={styles.yearPickerHeader}>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.yearPickerTitle}>اختر السنة</Text>
            </View>
            <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={styles.yearGrid}>
              {YEARS.map(year => (
                <TouchableOpacity
                  key={year}
                  style={[styles.yearItem, selectedYear === year && styles.yearItemActive]}
                  onPress={() => { setSelectedYear(year); setShowYearPicker(false); }}
                >
                  <Text style={[styles.yearItemText, selectedYear === year && styles.yearItemTextActive]}>{year}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E1A' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 8,
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
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    marginHorizontal: 6,
    writingDirection: 'rtl',
  },
  filterToggleBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  filterToggleBtnActive: {
    backgroundColor: '#E50914',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E50914',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFF',
  },

  // Filter Section
  filterSection: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(15,20,35,0.95)',
  },
  filterGroup: {
    paddingTop: 10,
    paddingBottom: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'right',
    writingDirection: 'rtl',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chipScroll: {
    paddingHorizontal: 12,
    gap: 6,
    flexDirection: 'row-reverse',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  chipText: {
    fontSize: 13,
    color: '#9CA3AF',
    writingDirection: 'rtl',
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterSelectBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterSelectBtnActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  filterSelectText: {
    fontSize: 13,
    color: '#9CA3AF',
    writingDirection: 'rtl',
  },
  filterSelectTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sortChipActive: {
    backgroundColor: 'rgba(229,9,20,0.2)',
    borderColor: '#E50914',
  },
  sortChipText: {
    fontSize: 12,
    color: '#6B7280',
    writingDirection: 'rtl',
  },
  sortChipTextActive: {
    color: '#E50914',
    fontWeight: '600',
  },
  clearBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(229,9,20,0.1)',
  },
  clearBtnText: {
    fontSize: 12,
    color: '#E50914',
    fontWeight: '600',
    writingDirection: 'rtl',
  },

  // Active Filter Bar (summary when collapsed)
  activeFilterBar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 8,
  },
  activeFilterScroll: {
    paddingHorizontal: 12,
    gap: 6,
    flexDirection: 'row-reverse',
  },
  activeTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#E50914',
  },
  activeTagText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  clearAllTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  clearAllTagText: {
    fontSize: 12,
    color: '#9CA3AF',
    writingDirection: 'rtl',
  },

  // Content
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#6B7280', fontSize: 14, writingDirection: 'rtl' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: '#6B7280', fontSize: 16, writingDirection: 'rtl' },
  emptyResetBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(229,9,20,0.15)',
  },
  emptyResetText: { color: '#E50914', fontSize: 14, fontWeight: '600', writingDirection: 'rtl' },
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
  cardMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  cardRating: { fontSize: 11, color: '#9CA3AF' },
  cardYear: { fontSize: 10, color: '#6B7280' },

  // Year Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearPickerContainer: {
    width: '85%',
    maxWidth: 340,
    maxHeight: 420,
    backgroundColor: '#151B2B',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  yearPickerHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  yearPickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    writingDirection: 'rtl',
  },
  yearGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    padding: 8,
  },
  yearItem: {
    width: '23%',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    margin: '1%',
  },
  yearItemActive: {
    backgroundColor: '#E50914',
  },
  yearItemText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  yearItemTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
