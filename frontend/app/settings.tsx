import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Switch, Alert, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const NAV_TABS = [
  { id: 'live', label: 'مباشر', route: '/live-tv' },
  { id: 'movies', label: 'أفلام', route: '/movies' },
  { id: 'series', label: 'مسلسلات', route: '/series' },
  { id: 'search', label: 'بحث', route: '/search' },
  { id: 'settings', label: 'إعدادات', route: '/settings' },
];

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  iconColor: string;
  type: 'navigate' | 'toggle' | 'info';
  value?: boolean;
  badge?: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const [showChannels, setShowChannels] = useState(true);
  const [showMovies, setShowMovies] = useState(true);
  const [showSeries, setShowSeries] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [arabicNames, setArabicNames] = useState(true);

  const SETTINGS: SettingItem[] = [
    {
      id: 'font',
      title: 'إعدادات الخط',
      subtitle: 'حجم الخط ونوعه',
      icon: 'text-outline',
      iconColor: '#3B82F6',
      type: 'navigate',
    },
    {
      id: 'colors',
      title: 'إعدادات الألوان',
      subtitle: 'لون التمييز والخلفية',
      icon: 'color-palette-outline',
      iconColor: '#E50914',
      type: 'navigate',
    },
    {
      id: 'layout',
      title: 'إعدادات التخطيط',
      subtitle: 'طريقة عرض القنوات والمحتوى',
      icon: 'grid-outline',
      iconColor: '#A855F7',
      type: 'navigate',
    },
    {
      id: 'favorites',
      title: 'المفضلة',
      subtitle: 'إدارة القنوات والأفلام المفضلة',
      icon: 'heart-outline',
      iconColor: '#EC4899',
      type: 'navigate',
    },
    {
      id: 'refresh',
      title: 'تحديث قائمة القنوات',
      subtitle: 'جلب أحدث القنوات من الخادم',
      icon: 'refresh-outline',
      iconColor: '#10B981',
      type: 'navigate',
    },
    {
      id: 'about',
      title: 'معلومات التطبيق',
      subtitle: 'الإصدار والمطور',
      icon: 'information-circle-outline',
      iconColor: '#6B7280',
      type: 'info',
      badge: 'V 1.2.0',
    },
  ];

  const handleSettingPress = async (id: string) => {
    if (id === 'favorites') {
      router.push('/favorites');
    } else if (id === 'refresh') {
      try {
        const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || '';
        await fetch(`${BACKEND}/api/channels/refresh`, { method: 'POST' });
        Alert.alert('تحديث', 'جاري تحديث قائمة القنوات في الخلفية...');
      } catch (e) {
        Alert.alert('خطأ', 'تعذر الاتصال بالخادم');
      }
    } else if (id === 'about') {
      Alert.alert(
        'معلومات التطبيق',
        'تلفزيون المسودي\nالإصدار: 1.2.0\n\nمصادر البيانات:\n• IPTV-ORG للقنوات المجانية\n• TheMovieDB للأفلام والمسلسلات\n• Videasy لتشغيل المحتوى',
        [{ text: 'حسناً' }]
      );
    } else if (id === 'font') {
      Alert.alert('إعدادات الخط', 'قريباً - سيتم إضافة إعدادات الخط في التحديث القادم', [{ text: 'حسناً' }]);
    } else if (id === 'colors') {
      Alert.alert('إعدادات الألوان', 'قريباً - سيتم إضافة إعدادات الألوان في التحديث القادم', [{ text: 'حسناً' }]);
    } else if (id === 'layout') {
      Alert.alert('إعدادات التخطيط', 'قريباً - سيتم إضافة خيارات التخطيط في التحديث القادم', [{ text: 'حسناً' }]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Nav */}
      <SafeAreaView>
        <View style={styles.navBar}>
          <View style={styles.logoRow}>
            <Ionicons name="play-circle" size={22} color="#E50914" />
            <Text style={styles.logoText}>تلفزيون المسودي</Text>
          </View>
          <View style={styles.navTabs}>
            {NAV_TABS.map(tab => (
              <TouchableOpacity
                key={tab.id}
                testID={`settings-nav-${tab.id}`}
                style={[styles.navTab, tab.id === 'settings' && styles.navTabActive]}
                onPress={() => tab.id === 'settings' ? null : router.replace(tab.route as any)}
              >
                <Text style={[styles.navTabText, tab.id === 'settings' && styles.navTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>الإعدادات</Text>

        {/* Settings Items */}
        <View style={styles.card}>
          {SETTINGS.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              testID={`setting-${item.id}`}
              style={[styles.settingRow, idx < SETTINGS.length - 1 && styles.settingRowBorder]}
              onPress={() => handleSettingPress(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={18} color="#6B7280" />
              <View style={styles.settingTexts}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                {item.subtitle && <Text style={styles.settingSubtitle}>{item.subtitle}</Text>}
              </View>
              {item.badge && (
                <View style={styles.badge}><Text style={styles.badgeText}>{item.badge}</Text></View>
              )}
              <View style={[styles.settingIcon, { backgroundColor: `${item.iconColor}20` }]}>
                <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Toggle Settings */}
        <Text style={styles.sectionLabel}>إعدادات العرض</Text>
        <View style={styles.card}>
          <ToggleRow
            testID="toggle-arabic-names"
            title="الأسماء العربية"
            subtitle="عرض أسماء القنوات بالعربية"
            value={arabicNames}
            onChange={setArabicNames}
          />
          <ToggleRow
            testID="toggle-autoplay"
            title="تشغيل تلقائي"
            subtitle="تشغيل القناة عند الاختيار مباشرة"
            value={autoPlay}
            onChange={setAutoPlay}
          />
          <ToggleRow
            testID="toggle-show-channels"
            title="إظهار قسم القنوات"
            subtitle="عرض القنوات في الشاشة الرئيسية"
            value={showChannels}
            onChange={setShowChannels}
          />
          <ToggleRow
            testID="toggle-show-movies"
            title="إظهار قسم الأفلام"
            subtitle="عرض الأفلام في الشاشة الرئيسية"
            value={showMovies}
            onChange={setShowMovies}
          />
          <ToggleRow
            testID="toggle-show-series"
            title="إظهار قسم المسلسلات"
            subtitle="عرض المسلسلات في الشاشة الرئيسية"
            value={showSeries}
            onChange={setShowSeries}
            last
          />
        </View>

        {/* App Info Footer */}
        <View style={styles.footer}>
          <Ionicons name="play-circle" size={32} color="#E50914" />
          <Text style={styles.footerTitle}>تلفزيون المسودي</Text>
          <Text style={styles.footerVersion}>الإصدار 1.2.0</Text>
          <Text style={styles.footerDev}>تلفزيون المسودي Dev</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ToggleRow({ title, subtitle, value, onChange, testID, last = false }: {
  title: string; subtitle: string; value: boolean;
  onChange: (v: boolean) => void; testID: string; last?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, !last && styles.settingRowBorder]}>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#374151', true: '#E50914' }}
        thumbColor={value ? '#FFF' : '#9CA3AF'}
        testID={testID}
      />
      <View style={styles.toggleTexts}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  navBar: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  logoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  logoText: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  navTabs: { flexDirection: 'row-reverse', gap: 4 },
  navTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  navTabActive: { backgroundColor: '#E50914' },
  navTabText: { fontSize: 13, color: '#9CA3AF', writingDirection: 'rtl' },
  navTabTextActive: { color: '#FFF', fontWeight: '700' },
  content: { padding: 16, gap: 12 },
  pageTitle: {
    fontSize: 22, fontWeight: 'bold', color: '#FFF',
    textAlign: 'right', writingDirection: 'rtl', marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13, color: '#6B7280', textAlign: 'right',
    writingDirection: 'rtl', marginTop: 4,
  },
  card: {
    backgroundColor: '#111', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  settingIcon: {
    width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  settingTexts: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '600', color: '#FFF', textAlign: 'right', writingDirection: 'rtl' },
  settingSubtitle: { fontSize: 12, color: '#6B7280', textAlign: 'right', marginTop: 2, writingDirection: 'rtl' },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#E50914',
  },
  badgeText: { fontSize: 11, color: '#FFF', fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  toggleTexts: { flex: 1 },
  footer: { alignItems: 'center', paddingVertical: 24, gap: 4 },
  footerTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginTop: 6 },
  footerVersion: { fontSize: 13, color: '#6B7280' },
  footerDev: { fontSize: 12, color: '#374151' },
});
