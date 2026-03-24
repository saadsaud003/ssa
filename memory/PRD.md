# IPTV Pro - Android TV App

## Original Problem Statement
بناء تطبيق Android TV لتثبيته على التلفاز الذكي. تصميم الواجهة شبيه بـ IPTV Smarters Pro مع عرض القنوات في شبكة (Grid). تصميم عربي (RTL). استخدام iptv-org API كمصدر للقنوات. ربط محرك البحث بـ TheMovieDB API. مشغل فيديو يدعم M3U8.

## Architecture

### Backend (FastAPI + MongoDB)
- **Port**: 8001
- **DB**: MongoDB (iptv_database)
- **Endpoints**:
  - `GET /api/channels` - Arabic channels from iptv-org (paginated, filterable)
  - `GET /api/channels/status` - Cache status (8264 channels loaded)
  - `GET /api/channels/categories` - Channel categories
  - `POST /api/channels/refresh` - Force refresh cache
  - `GET /api/movies/popular` - TMDB popular movies (Arabic)
  - `GET /api/movies/search?query=` - TMDB movie search
  - `GET /api/movies/genres` - Movie genres
  - `GET /api/series/popular` - TMDB popular series
  - `GET /api/series/search?query=` - Series search
  - `GET /api/search?query=` - Unified search (channels + movies + series)
  - `GET /api/favorites` - Get favorites
  - `POST /api/favorites` - Add favorite
  - `DELETE /api/favorites/{item_id}` - Remove favorite
  - `GET /api/favorites/check/{item_id}` - Check if favorited

### Frontend (Expo React Native)
- **Framework**: Expo SDK 54, expo-router
- **Video**: expo-video (HLS/M3U8 support)
- **Gradients**: expo-linear-gradient
- **RTL**: I18nManager.forceRTL(true)

## Screens

| Screen | File | Description |
|--------|------|-------------|
| Home | app/index.tsx | 3 gradient cards (Live, Movies, Series) |
| Live TV | app/live-tv.tsx | Split view: mini-player + channel list |
| Movies | app/movies.tsx | TMDB movies grid with Arabic posters |
| Series | app/series.tsx | TMDB series grid |
| Search | app/search.tsx | Unified search (channels + movies + series) |
| Player | app/player.tsx | Full-screen M3U8 video player |
| Favorites | app/favorites.tsx | Saved items management |

## What's Been Implemented (2026-03-24)

### ✅ Completed
- [x] Home screen with 3 gradient cards (RTL)
- [x] Live TV screen with 8,264 Arabic channels from iptv-org
- [x] Mini video player with M3U8 streaming support
- [x] Category tabs filtering
- [x] Movies screen with TMDB Arabic posters (20/page)
- [x] Series screen with TMDB Arabic data
- [x] Global search (channels + movies + series)
- [x] Favorites system (backend CRUD)
- [x] Full-screen video player with controls overlay
- [x] Channel data caching (24h TTL in MongoDB)
- [x] TMDB API integration (key: 25139e4f6eccde28a014b9230c815e83)
- [x] Android TV intent filters (LEANBACK_LAUNCHER)
- [x] Alert feedback for favorites actions
- [x] Landscape orientation for TV

## Data Sources
- **IPTV Channels**: https://iptv-org.github.io/api/ (channels.json + streams.json)
- **Movies/Series**: TheMovieDB API (TMDB) - Arabic language
- **Total Channels**: 8,264 Arabic channels with M3U8 streams

## Known Limitations
- Mini-player HLS streams may not work in web browser preview (CORS) - works on native Android TV
- Video player shows error screen in web preview (expected)

## Prioritized Backlog

### P0 (Critical)
- None - core features all working

### P1 (High Priority)
- [ ] Channel logo images display (some logos need CORS handling)
- [ ] EPG (Electronic Program Guide) - show current program info
- [ ] Channel grid view (toggle between list and grid)

### P2 (Nice to Have)
- [ ] User authentication / profiles
- [ ] Watch history
- [ ] Parental controls
- [ ] Multi-language support
- [ ] Custom M3U playlist import
- [ ] Picture-in-picture mode
