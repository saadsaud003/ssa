"""IPTV App Backend API Tests"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')


@pytest.fixture
def client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ─── Channels ─────────────────────────────────────────────────────────────────

class TestChannels:
    """Channel endpoints"""

    def test_channels_status(self, client):
        r = client.get(f"{BASE_URL}/api/channels/status")
        assert r.status_code == 200
        data = r.json()
        assert 'loaded' in data
        assert 'count' in data
        print(f"Channels loaded: {data['loaded']}, count: {data['count']}")

    def test_channels_status_has_8247_plus(self, client):
        r = client.get(f"{BASE_URL}/api/channels/status")
        data = r.json()
        assert data['count'] >= 1000, f"Expected 1000+ channels, got {data['count']}"

    def test_get_channels_default(self, client):
        r = client.get(f"{BASE_URL}/api/channels")
        assert r.status_code == 200
        data = r.json()
        assert 'channels' in data
        assert 'total' in data
        assert len(data['channels']) > 0
        print(f"Arabic channels total: {data['total']}, page size: {len(data['channels'])}")

    def test_get_channels_arabic_only(self, client):
        r = client.get(f"{BASE_URL}/api/channels?arabic_only=true")
        assert r.status_code == 200
        data = r.json()
        for ch in data['channels']:
            assert ch['is_arabic'] is True

    def test_get_channels_with_category(self, client):
        r = client.get(f"{BASE_URL}/api/channels?category=news")
        assert r.status_code == 200
        data = r.json()
        assert 'channels' in data

    def test_get_channels_search(self, client):
        r = client.get(f"{BASE_URL}/api/channels?search=sport")
        assert r.status_code == 200
        data = r.json()
        assert 'channels' in data

    def test_get_categories(self, client):
        r = client.get(f"{BASE_URL}/api/channels/categories")
        assert r.status_code == 200
        data = r.json()
        assert 'categories' in data
        assert len(data['categories']) > 0


# ─── Movies ───────────────────────────────────────────────────────────────────

class TestMovies:
    """Movie endpoints"""

    def test_get_popular_movies(self, client):
        r = client.get(f"{BASE_URL}/api/movies/popular")
        assert r.status_code == 200
        data = r.json()
        assert 'movies' in data
        assert len(data['movies']) > 0
        print(f"Movies count: {len(data['movies'])}")

    def test_movies_have_required_fields(self, client):
        r = client.get(f"{BASE_URL}/api/movies/popular")
        data = r.json()
        for m in data['movies'][:3]:
            assert 'id' in m
            assert 'title' in m
            assert 'poster' in m

    def test_search_movies(self, client):
        r = client.get(f"{BASE_URL}/api/movies/search?query=action")
        assert r.status_code == 200
        data = r.json()
        assert 'movies' in data

    def test_movie_genres(self, client):
        r = client.get(f"{BASE_URL}/api/movies/genres")
        assert r.status_code == 200
        data = r.json()
        assert 'genres' in data


# ─── Series ───────────────────────────────────────────────────────────────────

class TestSeries:
    """Series endpoints"""

    def test_get_popular_series(self, client):
        r = client.get(f"{BASE_URL}/api/series/popular")
        assert r.status_code == 200
        data = r.json()
        assert 'series' in data
        assert len(data['series']) > 0
        print(f"Series count: {len(data['series'])}")

    def test_series_have_required_fields(self, client):
        r = client.get(f"{BASE_URL}/api/series/popular")
        data = r.json()
        for s in data['series'][:3]:
            assert 'id' in s
            assert 'name' in s
            assert 'poster' in s

    def test_search_series(self, client):
        r = client.get(f"{BASE_URL}/api/series/search?query=drama")
        assert r.status_code == 200


# ─── Unified Search ───────────────────────────────────────────────────────────

class TestSearch:
    def test_unified_search(self, client):
        r = client.get(f"{BASE_URL}/api/search?query=arabic")
        assert r.status_code == 200
        data = r.json()
        assert 'channels' in data
        assert 'movies' in data
        assert 'series' in data


# ─── Favorites ────────────────────────────────────────────────────────────────

class TestFavorites:
    """Favorites CRUD"""

    def test_get_favorites(self, client):
        r = client.get(f"{BASE_URL}/api/favorites")
        assert r.status_code == 200
        data = r.json()
        assert 'favorites' in data

    def test_add_favorite(self, client):
        payload = {
            "item_id": "TEST_channel_001",
            "item_type": "channel",
            "name": "TEST Channel",
            "logo": "https://example.com/logo.png",
            "stream_url": "https://example.com/stream.m3u8",
            "metadata": {}
        }
        r = client.post(f"{BASE_URL}/api/favorites", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert 'id' in data or data.get('already_exists')

    def test_check_favorite(self, client):
        r = client.get(f"{BASE_URL}/api/favorites/check/TEST_channel_001")
        assert r.status_code == 200
        data = r.json()
        assert 'is_favorite' in data
        assert data['is_favorite'] is True

    def test_delete_favorite(self, client):
        r = client.delete(f"{BASE_URL}/api/favorites/TEST_channel_001")
        assert r.status_code == 200
        data = r.json()
        assert 'message' in data

    def test_verify_deleted_favorite(self, client):
        r = client.get(f"{BASE_URL}/api/favorites/check/TEST_channel_001")
        assert r.status_code == 200
        data = r.json()
        assert data['is_favorite'] is False

    def test_delete_nonexistent_favorite(self, client):
        r = client.delete(f"{BASE_URL}/api/favorites/nonexistent_id_xyz")
        assert r.status_code == 404
