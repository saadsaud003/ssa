import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Image, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width } = Dimensions.get('window');

interface Favorite {
  id: string;
  item_id: string;
  item_type: 'channel' | 'movie' | 'series';
  name: string;
  logo: string;
  stream_url: string;
  created_at: string;
}

type FilterType = 'all' | 'channel' | 'movie' | 'series';

const TYPE_LABELS: Record<string, string> = {
  channel: 'قناة',
  movie: 'فيلم',
  series: 'مسلسل',
};

const TYPE_COLORS: Record<string, string> = {
  channel: '#00D4FF',
  movie: '#E50914',
  series: '#A855F7',
};

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [filtered, setFiltered] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchFavorites();
  }, []);

  useEffect(() => {
    if (activeFilter === 'all') {
      setFiltered(favorites);
    } else {
      setFiltered(favorites.filter(f => f.item_type === activeFilter));
    }
  }, [activeFilter, favorites]);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/favorites`);
      const data = await res.json();
      setFavorites(data.favorites || []);
    } catch (e) {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (itemId: string, name: string) => {
    Alert.alert(
      'حذف من المفضلة',
      `هل تريد حذف "${name}" من المفضلة؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND}/api/favorites/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
              setFavorites(prev => prev.filter(f => f.item_id !== itemId));
            } catch (e) {}
          },
        },
      ]
    );
  };

  const FILTERS: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'الكل' },
    { id: 'channel', label: 'قنوات' },
    { id: 'movie', label: 'أفلام' },
    { id: 'series', label: 'مسلسلات' },
  ];

  const renderItem = useCallback(({ item }: { item: Favorite }) => {
    const color = TYPE_COLORS[item.item_type] || '#9CA3AF';
    return (
      <TouchableOpacity
        testID={`fav-item-${item.item_id}`}
        style={styles.favItem}
        onPress={() => {
          if (item.item_type === 'channel' && item.stream_url) {
            router.push({
              pathname: '/player',
              params: { url: item.stream_url, name: item.name, logo: item.logo }
            });
          }
        }}
        activeOpacity={0.8}
      >
        {item.logo ? (
          <Image
            source={{ uri: item.logo }}
            style={styles.itemLogo}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.itemLogoPlaceholder, { borderColor: color }]}>
            <Ionicons
              name={item.item_type === 'channel' ? 'tv-outline' : 'film-outline'}
              size={24}
              color={color}
            />
          </View>
        )}

        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.itemMeta}>
            <View style={[styles.typeBadge, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
              <Text style={[styles.typeBadgeText, { color }]}>{TYPE_LABELS[item.item_type]}</Text>
            </View>
          </View>
        </View>

        {item.item_type === 'channel' && item.stream_url && (
          <TouchableOpacity
            testID={`play-fav-${item.item_id}`}
            style={styles.playBtn}
            onPress={() => router.push({
              pathname: '/player',
              params: { url: item.stream_url, name: item.name, logo: item.logo }
            })}
          >
            <Ionicons name="play-circle" size={32} color="#00D4FF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          testID={`remove-fav-${item.item_id}`}
          style={styles.removeBtn}
          onPress={() => removeFavorite(item.item_id, item.name)}
        >
          <Ionicons name="trash-outline" size={20} color="#E50914" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>المفضلة</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{favorites.length}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            testID={`filter-${f.id}`}
            style={[styles.filterTab, activeFilter === f.id && styles.filterTabActive]}
            onPress={() => setActiveFilter(f.id)}
          >
            <Text style={[styles.filterText, activeFilter === f.id && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#00D4FF" />
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="heart-outline" size={64} color="#374151" />
          <Text style={styles.emptyTitle}>
            {favorites.length === 0 ? 'المفضلة فارغة' : 'لا توجد عناصر في هذا التصنيف'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {favorites.length === 0 ? 'أضف قنوات وأفلاماً إلى المفضلة' : 'جرب تصنيفاً آخر'}
          </Text>
          {favorites.length === 0 && (
            <TouchableOpacity testID="go-live-btn" style={styles.goBtn} onPress={() => router.push('/live-tv')}>
              <Text style={styles.goBtnText}>تصفح القنوات</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.item_id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchFavorites}
          refreshing={loading}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#151B2B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  countText: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
  filterRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#151B2B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterTabActive: { backgroundColor: '#E50914', borderColor: '#E50914' },
  filterText: { fontSize: 13, color: '#9CA3AF', writingDirection: 'rtl' },
  filterTextActive: { color: '#FFFFFF', fontWeight: '600' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#6B7280', fontSize: 14, writingDirection: 'rtl' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  goBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#00D4FF',
  },
  goBtnText: { fontSize: 15, fontWeight: 'bold', color: '#000000', writingDirection: 'rtl' },
  listContent: { padding: 16, gap: 10 },
  favItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#151B2B',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  itemLogo: {
    width: 60,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#1F2937',
  },
  itemLogoPlaceholder: {
    width: 60,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  itemMeta: { flexDirection: 'row-reverse', marginTop: 4 },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  playBtn: { padding: 4 },
  removeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(229,9,20,0.1)',
  },
});
