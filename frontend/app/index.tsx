import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, ActivityIndicator, Dimensions, Animated, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const NAV_TABS = [
  { id: 'home', label: 'مباشر', route: '/live-tv', icon: 'radio' },
  { id: 'movies', label: 'أفلام', route: '/movies', icon: 'film' },
  { id: 'series', label: 'مسلسلات', route: '/series', icon: 'tv' },
  { id: 'search', label: 'بحث', route: '/search', icon: 'search' },
  { id: 'settings', label: 'إعدادات', route: '/settings', icon: 'settings' },
];

interface Channel { id: string; name: string; arabic_name?: string; logo: string; stream_url: string; category: string; }
interface Movie { id: number; title: string; poster: string; backdrop: string; rating: number; }
interface Series { id: number; name: string; poster: string; rating: number; }

export default function HomeScreen() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [heroMovie, setHeroMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [chRes, mvRes, srRes] = await Promise.all([
        fetch(`${BACKEND}/api/channels?page=1&limit=10&arabic_only=true`),
        fetch(`${BACKEND}/api/movies/popular?page=1`),
        fetch(`${BACKEND}/api/series/popular?page=1`),
      ]);
      const [chData, mvData, srData] = await Promise.all([chRes.json(), mvRes.json(), srRes.json()]);
      setChannels(chData.channels || []);
      const mvList: Movie[] = mvData.movies || [];
      setMovies(mvList);
      setHeroMovie(mvList.find(m => m.backdrop) || mvList[0] || null);
      setSeries(srData.series || []);
    } catch (e) {}
    finally {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Top Navigation */}
      <SafeAreaView>
        <View style={styles.navBar}>
          <View style={styles.logoRow}>
            <Ionicons name="play-circle" size={22} color="#E50914" />
            <Text style={styles.logoText}>SaadTV</Text>
          </View>
          <View style={styles.navTabs}>
            {NAV_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                testID={`nav-tab-${tab.id}`}
                style={[styles.navTab, tab.id === 'home' && styles.navTabActive]}
                onPress={() => router.push(tab.route as any)}
              >
                <Text style={[styles.navTabText, tab.id === 'home' && styles.navTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      ) : (
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Banner */}
          {heroMovie && (
            <TouchableOpacity
              testID="hero-banner"
              style={styles.heroBanner}
              onPress={() => router.push({ pathname: '/webplayer', params: { type: 'movie', id: String(heroMovie.id), name: heroMovie.title } })}
              activeOpacity={0.9}
            >
              {heroMovie.backdrop ? (
                <Image source={{ uri: heroMovie.backdrop }} style={styles.heroImage} resizeMode="cover" />
              ) : (
                <View style={[styles.heroImage, { backgroundColor: '#1a1a2e' }]} />
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)', '#000']}
                style={styles.heroGradient}
              >
                <Text style={styles.heroTitle}>{heroMovie.title}</Text>
                <View style={styles.heroActions}>
                  <TouchableOpacity
                    testID="hero-watch-btn"
                    style={styles.watchNowBtn}
                    onPress={() => router.push({ pathname: '/webplayer', params: { type: 'movie', id: String(heroMovie.id), name: heroMovie.title } })}
                  >
                    <Ionicons name="play" size={18} color="#fff" />
                    <Text style={styles.watchNowText}>شاهد الآن</Text>
                  </TouchableOpacity>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.ratingText}>{heroMovie.rating.toFixed(1)}</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Featured Channels */}
          {channels.length > 0 && (
            <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
              <View style={styles.sectionHeader}>
                <TouchableOpacity testID="see-all-channels" onPress={() => router.push('/live-tv')}>
                  <Text style={styles.seeAll}>عرض الكل</Text>
                </TouchableOpacity>
                <Text style={styles.sectionTitle}>القنوات المميزة</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
                {channels.map(ch => (
                  <TouchableOpacity
                    key={ch.id}
                    testID={`featured-channel-${ch.id}`}
                    style={styles.channelCard}
                    onPress={() => router.push({ pathname: '/player', params: { url: ch.stream_url, name: ch.arabic_name || ch.name, logo: ch.logo } })}
                  >
                    <View style={styles.channelLogoWrap}>
                      {ch.logo ? (
                        <Image source={{ uri: ch.logo }} style={styles.channelLogo} resizeMode="contain" />
                      ) : (
                        <View style={styles.channelLogoPlaceholder}>
                          <Ionicons name="tv-outline" size={28} color="#E50914" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.channelName} numberOfLines={2}>{ch.arabic_name || ch.name}</Text>
                    <View style={styles.liveDot}><Text style={styles.liveText}>مباشر</Text></View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Trending Movies */}
          {movies.length > 0 && (
            <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
              <View style={styles.sectionHeader}>
                <TouchableOpacity testID="see-all-movies" onPress={() => router.push('/movies')}>
                  <Text style={styles.seeAll}>عرض الكل</Text>
                </TouchableOpacity>
                <Text style={styles.sectionTitle}>الأفلام الرائجة</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
                {movies.slice(0, 10).map(movie => (
                  <TouchableOpacity
                    key={movie.id}
                    testID={`trending-movie-${movie.id}`}
                    style={styles.mediaCard}
                    onPress={() => router.push({ pathname: '/webplayer', params: { type: 'movie', id: String(movie.id), name: movie.title } })}
                    activeOpacity={0.8}
                  >
                    {movie.poster ? (
                      <Image source={{ uri: movie.poster }} style={styles.mediaPoster} resizeMode="cover" />
                    ) : (
                      <View style={styles.mediaPosterPlaceholder}>
                        <Ionicons name="film-outline" size={32} color="#374151" />
                      </View>
                    )}
                    <View style={styles.mediaOverlay}>
                      <View style={styles.mediaRating}>
                        <Ionicons name="star" size={10} color="#FFD700" />
                        <Text style={styles.mediaRatingText}>{movie.rating.toFixed(1)}</Text>
                      </View>
                    </View>
                    <Text style={styles.mediaTitle} numberOfLines={2}>{movie.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* New Series */}
          {series.length > 0 && (
            <Animated.View style={[{ transform: [{ translateY: slideAnim }] }, styles.lastSection]}>
              <View style={styles.sectionHeader}>
                <TouchableOpacity testID="see-all-series" onPress={() => router.push('/series')}>
                  <Text style={styles.seeAll}>عرض الكل</Text>
                </TouchableOpacity>
                <Text style={styles.sectionTitle}>مسلسلات جديدة</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollContent}>
                {series.slice(0, 10).map(s => (
                  <TouchableOpacity
                    key={s.id}
                    testID={`new-series-${s.id}`}
                    style={styles.mediaCard}
                    onPress={() => router.push({ pathname: '/webplayer', params: { type: 'tv', id: String(s.id), name: s.name, season: '1', episode: '1' } })}
                    activeOpacity={0.8}
                  >
                    {s.poster ? (
                      <Image source={{ uri: s.poster }} style={styles.mediaPoster} resizeMode="cover" />
                    ) : (
                      <View style={styles.mediaPosterPlaceholder}>
                        <Ionicons name="tv-outline" size={32} color="#374151" />
                      </View>
                    )}
                    <View style={styles.mediaOverlay}>
                      <View style={styles.mediaRating}>
                        <Ionicons name="star" size={10} color="#FFD700" />
                        <Text style={styles.mediaRatingText}>{s.rating.toFixed(1)}</Text>
                      </View>
                    </View>
                    <Text style={styles.mediaTitle} numberOfLines={2}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}
        </Animated.ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#9CA3AF', fontSize: 14, writingDirection: 'rtl' },
  navBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  logoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  logoText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  navTabs: { flexDirection: 'row-reverse', gap: 4 },
  navTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  navTabActive: { backgroundColor: '#E50914' },
  navTabText: { fontSize: 13, color: '#9CA3AF', writingDirection: 'rtl' },
  navTabTextActive: { color: '#FFFFFF', fontWeight: '700' },
  scrollContent: { paddingBottom: 30 },
  heroBanner: {
    width: '100%',
    height: height * 0.38,
    backgroundColor: '#111',
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  watchNowBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E50914',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  watchNowText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14, writingDirection: 'rtl' },
  ratingBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ratingText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
    writingDirection: 'rtl',
  },
  seeAll: { fontSize: 13, color: '#E50914', writingDirection: 'rtl' },
  hScrollContent: { paddingHorizontal: 14, gap: 10 },
  channelCard: {
    width: 90,
    alignItems: 'center',
    gap: 6,
  },
  channelLogoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  channelLogo: { width: 65, height: 65, borderRadius: 32 },
  channelLogoPlaceholder: {
    width: 65, height: 65, borderRadius: 32,
    backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center',
  },
  channelName: { fontSize: 11, color: '#E5E7EB', textAlign: 'center', writingDirection: 'rtl' },
  liveDot: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#E50914',
  },
  liveText: { fontSize: 9, color: '#FFF', fontWeight: 'bold' },
  mediaCard: { width: 120, marginHorizontal: 2 },
  mediaPoster: {
    width: 120, height: 175, borderRadius: 10, backgroundColor: '#1a1a1a',
  },
  mediaPosterPlaceholder: {
    width: 120, height: 175, borderRadius: 10, backgroundColor: '#1a1a1a',
    alignItems: 'center', justifyContent: 'center',
  },
  mediaOverlay: {
    position: 'absolute', top: 6, left: 6,
  },
  mediaRating: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
  },
  mediaRatingText: { fontSize: 10, color: '#FFF' },
  mediaTitle: { fontSize: 11, color: '#E5E7EB', textAlign: 'right', marginTop: 5, writingDirection: 'rtl' },
  lastSection: { paddingBottom: 20 },
});
