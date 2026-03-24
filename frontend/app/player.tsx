import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar, Animated, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function PlayerScreen() {
  const router = useRouter();
  const { url, name, logo } = useLocalSearchParams<{ url: string; name: string; logo?: string }>();

  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();
  const controlsAnim = useRef(new Animated.Value(1)).current;

  const player = useVideoPlayer(
    url ? { uri: url as string } : null,
    (p) => {
      p.play();
      setIsPlaying(true);
    }
  );

  useEffect(() => {
    if (!url) {
      setHasError(true);
      setErrorMsg('رابط البث غير متاح');
      return;
    }

    const subscription = player.addListener('statusChange', (status) => {
      if ((status as any).status === 'error') {
        setHasError(true);
        setErrorMsg('تعذر تشغيل البث. تحقق من اتصالك بالإنترنت.');
        setIsPlaying(false);
      } else if ((status as any).status === 'readyToPlay') {
        setIsPlaying(true);
        setHasError(false);
      }
    });

    return () => subscription.remove();
  }, [url]);

  useEffect(() => {
    startControlsTimer();
    return () => clearTimeout(controlsTimer.current);
  }, []);

  const startControlsTimer = () => {
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      Animated.timing(controlsAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      setShowControls(false);
    }, 4000);
  };

  const handleTap = () => {
    Animated.timing(controlsAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    setShowControls(true);
    startControlsTimer();
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
    startControlsTimer();
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Video */}
      {!hasError ? (
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleTap} activeOpacity={1}>
          <VideoView
            testID="video-player"
            style={StyleSheet.absoluteFill}
            player={player}
            contentFit="contain"
            nativeControls={false}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.errorWrap}>
          <Ionicons name="warning-outline" size={56} color="#E50914" />
          <Text style={styles.errorTitle}>خطأ في التشغيل</Text>
          <Text style={styles.errorMsg}>{errorMsg}</Text>
          <TouchableOpacity
            testID="retry-btn"
            style={styles.retryBtn}
            onPress={() => {
              setHasError(false);
              if (url) {
                player.replace({ uri: url });
                player.play();
              }
            }}
          >
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Controls Overlay */}
      <Animated.View
        style={[styles.overlay, { opacity: controlsAnim }]}
        pointerEvents={showControls ? 'auto' : 'none'}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity testID="close-player-btn" onPress={() => router.back()} style={styles.topBtn}>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.channelInfo}>
            {logo ? (
              <Image source={{ uri: logo }} style={styles.channelLogo} resizeMode="contain" />
            ) : null}
            <Text style={styles.channelName} numberOfLines={1}>{name || 'بث مباشر'}</Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>مباشر</Text>
          </View>
        </View>

        {/* Center Controls */}
        <View style={styles.centerControls}>
          <TouchableOpacity testID="play-pause-btn" style={styles.playPauseBtn} onPress={togglePlayPause}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={44}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity testID="player-fullscreen-btn" style={styles.bottomBtn}>
            <Ionicons name="scan-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.bottomCenter}>
            <Text style={styles.streamType}>HLS</Text>
          </View>
          <TouchableOpacity
            testID="player-back-btn"
            onPress={() => router.back()}
            style={styles.bottomBtn}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#0A0E1A',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    writingDirection: 'rtl',
  },
  errorMsg: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#00D4FF',
  },
  retryText: { fontSize: 15, fontWeight: 'bold', color: '#000000', writingDirection: 'rtl' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  topBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  channelInfo: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  channelLogo: {
    width: 48,
    height: 32,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  channelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    writingDirection: 'rtl',
    flex: 1,
    textAlign: 'right',
  },
  livePill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E50914',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  liveText: { fontSize: 11, fontWeight: 'bold', color: '#FFFFFF' },
  centerControls: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  bottomBtn: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bottomCenter: { flex: 1, alignItems: 'center' },
  streamType: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
