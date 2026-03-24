import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WebPlayerScreen() {
  const router = useRouter();
  const { type, id, name, season, episode } = useLocalSearchParams<{
    type: string; id: string; name: string; season?: string; episode?: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  let playerUrl = '';
  if (type === 'movie') {
    playerUrl = `https://player.videasy.net/movie/${id}?color=E50914&overlay=true`;
  } else if (type === 'tv') {
    const s = season || '1';
    const e = episode || '1';
    playerUrl = `https://player.videasy.net/tv/${id}/${s}/${e}?nextEpisode=true&episodeSelector=true&autoplayNextEpisode=true&color=E50914&overlay=true`;
  }

  if (!playerUrl) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={56} color="#E50914" />
        <Text style={styles.errorText}>رابط التشغيل غير صحيح</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Top Bar */}
      <SafeAreaView style={styles.topBar}>
        <View style={styles.topBarInner}>
          <TouchableOpacity testID="close-webplayer-btn" onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.titleText} numberOfLines={1}>{name || 'مشاهدة'}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{type === 'movie' ? 'فيلم' : 'مسلسل'}</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* WebView Player */}
      <WebView
        testID="videasy-webview"
        source={{ uri: playerUrl }}
        style={styles.webview}
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        allowsInlineMediaPlayback
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setError(true); setLoading(false); }}
        userAgent="Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
      />

      {/* Loading Overlay */}
      {loading && !error && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>جاري تحميل المشغل...</Text>
        </View>
      )}

      {/* Error Overlay */}
      {error && (
        <View style={styles.errorOverlay}>
          <Ionicons name="warning-outline" size={48} color="#E50914" />
          <Text style={styles.errorOverlayText}>تعذر تحميل المشغل</Text>
          <TouchableOpacity testID="retry-webplayer-btn" style={styles.retryBtn} onPress={() => { setError(false); setLoading(true); }}>
            <Text style={styles.retryBtnText}>إعادة المحاولة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: '#333', marginTop: 8 }]} onPress={() => router.back()}>
            <Text style={styles.retryBtnText}>رجوع</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: { backgroundColor: 'rgba(0,0,0,0.9)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  topBarInner: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 10,
  },
  closeBtn: {
    padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  titleText: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#FFF', textAlign: 'right', writingDirection: 'rtl' },
  typeBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#E50914',
  },
  typeBadgeText: { fontSize: 12, color: '#FFF', fontWeight: '600', writingDirection: 'rtl' },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 14,
    top: 54,
  },
  loadingText: { color: '#9CA3AF', fontSize: 14, writingDirection: 'rtl' },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', gap: 12, top: 54,
  },
  errorOverlayText: { fontSize: 16, color: '#FFF', writingDirection: 'rtl' },
  retryBtn: {
    paddingHorizontal: 24, paddingVertical: 11, borderRadius: 10, backgroundColor: '#E50914',
  },
  retryBtnText: { fontSize: 14, fontWeight: 'bold', color: '#FFF', writingDirection: 'rtl' },
  errorContainer: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 14 },
  errorText: { fontSize: 16, color: '#FFF', writingDirection: 'rtl' },
  backBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, backgroundColor: '#E50914' },
  backBtnText: { fontSize: 14, fontWeight: 'bold', color: '#FFF', writingDirection: 'rtl' },
});
