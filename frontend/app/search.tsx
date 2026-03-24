import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Image, ActivityIndicator, TextInput, ScrollView,
  Dimensions, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width } = Dimensions.get('window');

interface Channel {
  id: string;
  name: string;
  logo: string;
  category: string;
  stream_url: string;
}

interface Movie {
  id: number;
  title: string;
  poster: string;
  rating: number;
  release_date: string;
}

interface TvSeries {
  id: number;
  name: string;
  poster: string;
  rating: number;
}

interface SearchResults {
  channels: Channel[];
  movies: Movie[];
  series: TvSeries[];
}

type Tab = 'all' | 'channels' | 'movies' | 'series';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ channels: [], movies: [], series: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleSearch = (text: string) => {
    setQuery(text);
    clearTimeout(searchTimeout.current);
    if (!text.trim()) {
      setResults({ channels: [], movies: [], series: [] });
      setHasSearched(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      setHasSearched(true);
      try {
        const res = await fetch(`${BACKEND}/api/search?query=${encodeURIComponent(text)}`);
        const data = await res.json();
        setResults(data);
      } catch (e) {
        setResults({ channels: [], movies: [], series: [] });
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'all', label: 'الكل' },
    { id: 'channels', label: 'قنوات' },
    { id: 'movies', label: 'أفلام' },
    { id: 'series', label: 'مسلسلات' },
  ];

  const totalResults = results.channels.length + results.movies.length + results.series.length;

  const renderContent = () => {
    if (!hasSearched) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="search-outline" size={64} color="#374151" />
          <Text style={styles.emptyTitle}>ابحث عن أي شيء</Text>
          <Text style={styles.emptySubtitle}>قنوات • أفلام • مسلسلات</Text>
        </View>
      );
    }
    if (loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#00D4FF" />
          <Text style={styles.loadingText}>جاري البحث...</Text>
        </View>
      );
    }
    if (totalResults === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="search-outline" size={48} color="#374151" />
          <Text style={styles.emptyTitle}>لا توجد نتائج</Text>
          <Text style={styles.emptySubtitle}>جرب كلمة بحث مختلفة</Text>
        </View>
      );
    }

    const showChannels = (activeTab === 'all' || activeTab === 'channels') && results.channels.length > 0;
    const showMovies = (activeTab === 'all' || activeTab === 'movies') && results.movies.length > 0;
    const showSeries = (activeTab === 'all' || activeTab === 'series') && results.series.length > 0;

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultsContent}>
        {showChannels && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>قنوات ({results.channels.length})</Text>
            {results.channels.map(ch => (
              <TouchableOpacity
                key={ch.id}
                testID={`search-channel-${ch.id}`}
                style={styles.channelRow}
                onPress={() => router.push({
                  pathname: '/player',
                  params: { url: ch.stream_url, name: ch.name, logo: ch.logo }
                })}
              >
                {ch.logo ? (
                  <Image source={{ uri: ch.logo }} style={styles.channelLogo} resizeMode="contain" />
                ) : (
                  <View style={styles.channelLogoPlaceholder}>
                    <Ionicons name="tv-outline" size={20} color="#6B7280" />
                  </View>
                )}
                <View style={styles.channelInfo}>
                  <Text style={styles.channelName}>{ch.name}</Text>
                  <Text style={styles.channelCat}>{ch.category}</Text>
                </View>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>مباشر</Text>
                </View>
                <Ionicons name="play-circle" size={28} color="#00D4FF" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {showMovies && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>أفلام ({results.movies.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {results.movies.map(movie => (
                <TouchableOpacity key={movie.id} testID={`search-movie-${movie.id}`} style={styles.movieCard}>
                  {movie.poster ? (
                    <Image source={{ uri: movie.poster }} style={styles.moviePoster} resizeMode="cover" />
                  ) : (
                    <View style={styles.moviePosterPlaceholder}>
                      <Ionicons name="film-outline" size={28} color="#374151" />
                    </View>
                  )}
                  <Text style={styles.movieTitle} numberOfLines={2}>{movie.title}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={10} color="#FFD700" />
                    <Text style={styles.ratingText}>{movie.rating.toFixed(1)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {showSeries && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>مسلسلات ({results.series.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {results.series.map(s => (
                <TouchableOpacity key={s.id} testID={`search-series-${s.id}`} style={styles.movieCard}>
                  {s.poster ? (
                    <Image source={{ uri: s.poster }} style={styles.moviePoster} resizeMode="cover" />
                  ) : (
                    <View style={styles.moviePosterPlaceholder}>
                      <Ionicons name="film-outline" size={28} color="#374151" />
                    </View>
                  )}
                  <Text style={styles.movieTitle} numberOfLines={2}>{s.name}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={10} color="#FFD700" />
                    <Text style={styles.ratingText}>{s.rating.toFixed(1)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#6B7280" style={{ marginLeft: 8 }} />
            <TextInput
              ref={inputRef}
              testID="global-search-input"
              style={styles.searchInput}
              placeholder="ابحث عن قنوات، أفلام، مسلسلات..."
              placeholderTextColor="#6B7280"
              value={query}
              onChangeText={handleSearch}
              autoFocus
              textAlign="right"
            />
            {query ? (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close-circle" size={18} color="#6B7280" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Tabs */}
        {hasSearched && !loading && totalResults > 0 && (
          <View style={styles.tabs}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.id}
                testID={`search-tab-${tab.id}`}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Content */}
        {renderContent()}
      </KeyboardAvoidingView>
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
  searchBar: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#151B2B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.3)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    marginHorizontal: 8,
    writingDirection: 'rtl',
  },
  tabs: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#151B2B',
  },
  tabActive: { backgroundColor: '#00D4FF' },
  tabText: { fontSize: 13, color: '#9CA3AF', writingDirection: 'rtl' },
  tabTextActive: { color: '#000', fontWeight: '600' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#6B7280', fontSize: 14, writingDirection: 'rtl' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#6B7280', writingDirection: 'rtl' },
  emptySubtitle: { fontSize: 13, color: '#374151', writingDirection: 'rtl' },
  resultsContent: { padding: 16, gap: 20 },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  channelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#151B2B',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  channelLogo: {
    width: 52,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#1F2937',
  },
  channelLogoPlaceholder: {
    width: 52,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelInfo: { flex: 1 },
  channelName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  channelCat: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  liveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#E50914',
  },
  liveBadgeText: { fontSize: 10, color: '#FFF', fontWeight: 'bold' },
  horizontalScroll: { marginHorizontal: -16 },
  movieCard: {
    width: 110,
    marginHorizontal: 6,
  },
  moviePoster: {
    width: 110,
    height: 160,
    borderRadius: 10,
    backgroundColor: '#1F2937',
  },
  moviePosterPlaceholder: {
    width: 110,
    height: 160,
    borderRadius: 10,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  movieTitle: {
    fontSize: 12,
    color: '#E5E7EB',
    textAlign: 'right',
    marginTop: 6,
    writingDirection: 'rtl',
  },
  ratingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  ratingText: { fontSize: 11, color: '#9CA3AF' },
});
