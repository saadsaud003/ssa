import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const CARDS = [
  {
    id: 'live',
    title: 'تلفزيون مباشر',
    subtitle: 'قنوات مباشرة',
    icon: 'tv' as const,
    gradient: ['#00D4FF', '#0055FF'] as [string, string],
    route: '/live-tv',
    testID: 'home-card-live',
  },
  {
    id: 'movies',
    title: 'أفلام',
    subtitle: 'أحدث الأفلام',
    icon: 'play-circle' as const,
    gradient: ['#FF5500', '#E50914'] as [string, string],
    route: '/movies',
    testID: 'home-card-movies',
  },
  {
    id: 'series',
    title: 'مسلسلات',
    subtitle: 'أفضل المسلسلات',
    icon: 'film' as const,
    gradient: ['#A855F7', '#7B2FBE'] as [string, string],
    route: '/series',
    testID: 'home-card-series',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity testID="search-icon-btn" onPress={() => router.push('/search')} style={styles.iconBtn}>
          <Ionicons name="search-outline" size={26} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.logoWrap}>
          <Ionicons name="play-circle" size={30} color="#00D4FF" />
          <Text style={styles.logoText}>IPTV Pro</Text>
        </View>

        <View style={styles.rightActions}>
          <TouchableOpacity testID="favorites-icon-btn" onPress={() => router.push('/favorites')} style={styles.iconBtn}>
            <Ionicons name="heart-outline" size={26} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity testID="settings-icon-btn" onPress={() => {}} style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={26} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Greeting */}
      <Animated.View style={[styles.greetingWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.greetingText}>مرحباً بك في</Text>
        <Text style={styles.greetingTitle}>تطبيق البث الذكي</Text>
      </Animated.View>

      {/* Category Cards */}
      <Animated.View style={[styles.cardsRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {CARDS.map((card, index) => (
          <CardItem key={card.id} card={card} index={index} onPress={() => router.push(card.route as any)} />
        ))}
      </Animated.View>

      {/* Bottom Bar */}
      <Animated.View style={[styles.bottomBar, { opacity: fadeAnim }]}>
        <TouchableOpacity testID="nav-search" onPress={() => router.push('/search')} style={styles.navItem}>
          <Ionicons name="search-outline" size={22} color="#6B7280" />
          <Text style={styles.navLabel}>بحث</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="nav-favorites" onPress={() => router.push('/favorites')} style={styles.navItem}>
          <Ionicons name="heart-outline" size={22} color="#6B7280" />
          <Text style={styles.navLabel}>المفضلة</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="nav-home" onPress={() => {}} style={[styles.navItem, styles.navActive]}>
          <Ionicons name="home" size={22} color="#00D4FF" />
          <Text style={[styles.navLabel, { color: '#00D4FF' }]}>الرئيسية</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

function CardItem({ card, index, onPress }: { card: typeof CARDS[0]; index: number; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        testID={card.testID}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
        style={styles.cardTouch}
      >
        <LinearGradient
          colors={card.gradient}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardIconWrap}>
            <Ionicons name={card.icon} size={56} color="rgba(255,255,255,0.95)" />
          </View>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
          <View style={styles.cardArrow}>
            <Ionicons name="arrow-back" size={18} color="rgba(255,255,255,0.7)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  logoWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  rightActions: {
    flexDirection: 'row-reverse',
    gap: 4,
  },
  iconBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  greetingWrap: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 10,
  },
  greetingText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 4,
    writingDirection: 'rtl',
  },
  cardsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 14,
    flex: 1,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: width > 600 ? 220 : undefined,
  },
  cardTouch: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    minHeight: height * 0.38,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 4,
    writingDirection: 'rtl',
  },
  cardArrow: {
    marginTop: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#0D1220',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  navActive: {},
  navLabel: {
    fontSize: 11,
    color: '#6B7280',
    writingDirection: 'rtl',
  },
});
