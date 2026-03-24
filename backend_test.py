#!/usr/bin/env python3
"""
Backend API Testing for IPTV Application
Tests all backend endpoints with various filter combinations
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Backend URL from environment configuration
BASE_URL = "https://iptv-tv-overhaul.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.results = []
        self.failed_tests = []
        
    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = f"{status} - {test_name}"
        if details:
            result += f" | {details}"
        print(result)
        self.results.append({
            'test': test_name,
            'success': success,
            'details': details
        })
        if not success:
            self.failed_tests.append(test_name)
    
    def make_request(self, endpoint: str, params: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        try:
            url = f"{BASE_URL}{endpoint}"
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    return True, data, response.status_code
                except json.JSONDecodeError:
                    return False, f"Invalid JSON response", response.status_code
            else:
                return False, f"HTTP {response.status_code}: {response.text[:200]}", response.status_code
                
        except requests.exceptions.Timeout:
            return False, "Request timeout (30s)", 0
        except requests.exceptions.ConnectionError:
            return False, "Connection error", 0
        except Exception as e:
            return False, f"Request error: {str(e)}", 0
    
    def test_movies_discover_no_filters(self):
        """Test movies discover with no filters (default)"""
        success, data, status = self.make_request("/movies/discover")
        
        if not success:
            self.log_result("Movies Discover - No Filters", False, data)
            return
            
        # Verify response structure
        required_fields = ['movies', 'total_pages', 'page']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            self.log_result("Movies Discover - No Filters", False, f"Missing fields: {missing_fields}")
            return
            
        # Verify movies array structure
        if data['movies'] and len(data['movies']) > 0:
            movie = data['movies'][0]
            movie_fields = ['id', 'title', 'poster', 'rating']
            missing_movie_fields = [f for f in movie_fields if f not in movie]
            if missing_movie_fields:
                self.log_result("Movies Discover - No Filters", False, f"Missing movie fields: {missing_movie_fields}")
                return
        
        self.log_result("Movies Discover - No Filters", True, f"Found {len(data['movies'])} movies, page {data['page']}/{data['total_pages']}")
    
    def test_movies_discover_genre_filter(self):
        """Test movies discover with genre filter (Action = 28)"""
        params = {'genre': 28}
        success, data, status = self.make_request("/movies/discover", params)
        
        if not success:
            self.log_result("Movies Discover - Genre Filter", False, data)
            return
            
        required_fields = ['movies', 'total_pages', 'page']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            self.log_result("Movies Discover - Genre Filter", False, f"Missing fields: {missing_fields}")
            return
            
        self.log_result("Movies Discover - Genre Filter", True, f"Found {len(data['movies'])} action movies")
    
    def test_movies_discover_year_filter(self):
        """Test movies discover with year filter"""
        params = {'year': 2025}
        success, data, status = self.make_request("/movies/discover", params)
        
        if not success:
            self.log_result("Movies Discover - Year Filter", False, data)
            return
            
        required_fields = ['movies', 'total_pages', 'page']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            self.log_result("Movies Discover - Year Filter", False, f"Missing fields: {missing_fields}")
            return
            
        self.log_result("Movies Discover - Year Filter", True, f"Found {len(data['movies'])} movies from 2025")
    
    def test_movies_discover_sort_filter(self):
        """Test movies discover with sort filter"""
        params = {'sort_by': 'vote_average.desc'}
        success, data, status = self.make_request("/movies/discover", params)
        
        if not success:
            self.log_result("Movies Discover - Sort Filter", False, data)
            return
            
        required_fields = ['movies', 'total_pages', 'page']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            self.log_result("Movies Discover - Sort Filter", False, f"Missing fields: {missing_fields}")
            return
            
        self.log_result("Movies Discover - Sort Filter", True, f"Found {len(data['movies'])} movies sorted by rating")
    
    def test_movies_discover_combined_filters(self):
        """Test movies discover with combined filters"""
        params = {'genre': 28, 'year': 2025, 'sort_by': 'vote_average.desc'}
        success, data, status = self.make_request("/movies/discover", params)
        
        if not success:
            self.log_result("Movies Discover - Combined Filters", False, data)
            return
            
        required_fields = ['movies', 'total_pages', 'page']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            self.log_result("Movies Discover - Combined Filters", False, f"Missing fields: {missing_fields}")
            return
            
        self.log_result("Movies Discover - Combined Filters", True, f"Found {len(data['movies'])} action movies from 2025 sorted by rating")
    
    def test_movies_discover_pagination(self):
        """Test movies discover with pagination"""
        params = {'page': 2, 'genre': 28}
        success, data, status = self.make_request("/movies/discover", params)
        
        if not success:
            self.log_result("Movies Discover - Pagination", False, data)
            return
            
        required_fields = ['movies', 'total_pages', 'page']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            self.log_result("Movies Discover - Pagination", False, f"Missing fields: {missing_fields}")
            return
            
        if data['page'] != 2:
            self.log_result("Movies Discover - Pagination", False, f"Expected page 2, got {data['page']}")
            return
            
        self.log_result("Movies Discover - Pagination", True, f"Page 2 returned {len(data['movies'])} movies")
    
    def test_series_discover_no_filters(self):
        """Test series discover with no filters (default)"""
        success, data, status = self.make_request("/series/discover")
        
        if not success:
            self.log_result("Series Discover - No Filters", False, data)
            return
            
        required_fields = ['series', 'total_pages', 'page']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            self.log_result("Series Discover - No Filters", False, f"Missing fields: {missing_fields}")
            return
            
        # Verify series array structure
        if data['series'] and len(data['series']) > 0:
            series = data['series'][0]
            series_fields = ['id', 'name', 'poster', 'rating']
            missing_series_fields = [f for f in series_fields if f not in series]
            if missing_series_fields:
                self.log_result("Series Discover - No Filters", False, f"Missing series fields: {missing_series_fields}")
                return
        
        self.log_result("Series Discover - No Filters", True, f"Found {len(data['series'])} series, page {data['page']}/{data['total_pages']}")
    
    def test_series_discover_genre_filter(self):
        """Test series discover with genre filter (Drama = 18)"""
        params = {'genre': 18}
        success, data, status = self.make_request("/series/discover", params)
        
        if not success:
            self.log_result("Series Discover - Genre Filter", False, data)
            return
            
        required_fields = ['series', 'total_pages', 'page']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            self.log_result("Series Discover - Genre Filter", False, f"Missing fields: {missing_fields}")
            return
            
        self.log_result("Series Discover - Genre Filter", True, f"Found {len(data['series'])} drama series")
    
    def test_series_discover_year_filter(self):
        """Test series discover with year filter"""
        params = {'year': 2024}
        success, data, status = self.make_request("/series/discover", params)
        
        if not success:
            self.log_result("Series Discover - Year Filter", False, data)
            return
            
        required_fields = ['series', 'total_pages', 'page']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            self.log_result("Series Discover - Year Filter", False, f"Missing fields: {missing_fields}")
            return
            
        self.log_result("Series Discover - Year Filter", True, f"Found {len(data['series'])} series from 2024")
    
    def test_series_discover_sort_filter(self):
        """Test series discover with sort filter"""
        params = {'sort_by': 'vote_average.desc'}
        success, data, status = self.make_request("/series/discover", params)
        
        if not success:
            self.log_result("Series Discover - Sort Filter", False, data)
            return
            
        required_fields = ['series', 'total_pages', 'page']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            self.log_result("Series Discover - Sort Filter", False, f"Missing fields: {missing_fields}")
            return
            
        self.log_result("Series Discover - Sort Filter", True, f"Found {len(data['series'])} series sorted by rating")
    
    def test_series_discover_combined_filters(self):
        """Test series discover with combined filters"""
        params = {'genre': 18, 'year': 2024, 'sort_by': 'vote_average.desc'}
        success, data, status = self.make_request("/series/discover", params)
        
        if not success:
            self.log_result("Series Discover - Combined Filters", False, data)
            return
            
        required_fields = ['series', 'total_pages', 'page']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            self.log_result("Series Discover - Combined Filters", False, f"Missing fields: {missing_fields}")
            return
            
        self.log_result("Series Discover - Combined Filters", True, f"Found {len(data['series'])} drama series from 2024 sorted by rating")
    
    def test_series_genres(self):
        """Test series genres endpoint"""
        success, data, status = self.make_request("/series/genres")
        
        if not success:
            self.log_result("Series Genres", False, data)
            return
            
        if 'genres' not in data:
            self.log_result("Series Genres", False, "Missing 'genres' field")
            return
            
        if not isinstance(data['genres'], list):
            self.log_result("Series Genres", False, "'genres' is not an array")
            return
            
        # Verify genre structure
        if data['genres'] and len(data['genres']) > 0:
            genre = data['genres'][0]
            if 'id' not in genre or 'name' not in genre:
                self.log_result("Series Genres", False, "Genre missing 'id' or 'name' fields")
                return
        
        self.log_result("Series Genres", True, f"Found {len(data['genres'])} series genres")
    
    def test_movies_genres(self):
        """Test movies genres endpoint"""
        success, data, status = self.make_request("/movies/genres")
        
        if not success:
            self.log_result("Movies Genres", False, data)
            return
            
        if 'genres' not in data:
            self.log_result("Movies Genres", False, "Missing 'genres' field")
            return
            
        if not isinstance(data['genres'], list):
            self.log_result("Movies Genres", False, "'genres' is not an array")
            return
            
        # Verify genre structure
        if data['genres'] and len(data['genres']) > 0:
            genre = data['genres'][0]
            if 'id' not in genre or 'name' not in genre:
                self.log_result("Movies Genres", False, "Genre missing 'id' or 'name' fields")
                return
        
        self.log_result("Movies Genres", True, f"Found {len(data['genres'])} movie genres")
    
    def test_movies_popular(self):
        """Test movies popular endpoint"""
        success, data, status = self.make_request("/movies/popular")
        
        if not success:
            self.log_result("Movies Popular", False, data)
            return
            
        required_fields = ['movies', 'total_pages', 'page']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            self.log_result("Movies Popular", False, f"Missing fields: {missing_fields}")
            return
            
        self.log_result("Movies Popular", True, f"Found {len(data['movies'])} popular movies")
    
    def test_series_popular(self):
        """Test series popular endpoint"""
        success, data, status = self.make_request("/series/popular")
        
        if not success:
            self.log_result("Series Popular", False, data)
            return
            
        required_fields = ['series', 'total_pages', 'page']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            self.log_result("Series Popular", False, f"Missing fields: {missing_fields}")
            return
            
        self.log_result("Series Popular", True, f"Found {len(data['series'])} popular series")
    
    def test_channels_status(self):
        """Test channels status endpoint"""
        success, data, status = self.make_request("/channels/status")
        
        if not success:
            self.log_result("Channels Status", False, data)
            return
            
        required_fields = ['loaded', 'count']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            self.log_result("Channels Status", False, f"Missing fields: {missing_fields}")
            return
            
        self.log_result("Channels Status", True, f"Channels loaded: {data['loaded']}, count: {data['count']}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Backend API Tests for IPTV Application")
        print(f"📍 Base URL: {BASE_URL}")
        print("=" * 80)
        
        # Test movies discover endpoints
        print("\n📽️ MOVIES DISCOVER TESTS")
        print("-" * 40)
        self.test_movies_discover_no_filters()
        self.test_movies_discover_genre_filter()
        self.test_movies_discover_year_filter()
        self.test_movies_discover_sort_filter()
        self.test_movies_discover_combined_filters()
        self.test_movies_discover_pagination()
        
        # Test series discover endpoints
        print("\n📺 SERIES DISCOVER TESTS")
        print("-" * 40)
        self.test_series_discover_no_filters()
        self.test_series_discover_genre_filter()
        self.test_series_discover_year_filter()
        self.test_series_discover_sort_filter()
        self.test_series_discover_combined_filters()
        
        # Test genre endpoints
        print("\n🎭 GENRE TESTS")
        print("-" * 40)
        self.test_series_genres()
        self.test_movies_genres()
        
        # Test popular endpoints
        print("\n⭐ POPULAR CONTENT TESTS")
        print("-" * 40)
        self.test_movies_popular()
        self.test_series_popular()
        
        # Test channels
        print("\n📡 CHANNELS TESTS")
        print("-" * 40)
        self.test_channels_status()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r['success']])
        failed_tests = len(self.failed_tests)
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        
        if self.failed_tests:
            print(f"\n🚨 FAILED TESTS:")
            for test in self.failed_tests:
                print(f"   - {test}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)