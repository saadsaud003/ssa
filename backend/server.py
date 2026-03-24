from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import requests
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

TMDB_API_KEY = os.environ.get('TMDB_API_KEY', '')
TMDB_BASE_URL = 'https://api.themoviedb.org/3'
TMDB_IMAGE_W500 = 'https://image.tmdb.org/t/p/w500'
TMDB_IMAGE_W1280 = 'https://image.tmdb.org/t/p/w1280'

IPTV_CHANNELS_URL = 'https://iptv-org.github.io/api/channels.json'
IPTV_STREAMS_URL = 'https://iptv-org.github.io/api/streams.json'
IPTV_CATEGORIES_URL = 'https://iptv-org.github.io/api/categories.json'

ARABIC_COUNTRIES = {'SA', 'AE', 'EG', 'IQ', 'QA', 'KW', 'BH', 'OM', 'JO', 'SY', 'LB', 'MA', 'DZ', 'TN', 'LY', 'SD', 'YE', 'PS'}
CACHE_TTL_HOURS = 24

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ─── Models ───────────────────────────────────────────────────────────────────

class FavoriteCreate(BaseModel):
    item_id: str
    item_type: str  # 'channel' | 'movie' | 'series'
    name: str
    logo: str = ''
    stream_url: str = ''
    metadata: dict = {}

class Favorite(FavoriteCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ─── IPTV Data Fetching ────────────────────────────────────────────────────────

def _fetch_url(url: str, timeout: int = 60):
    resp = requests.get(url, timeout=timeout, headers={'User-Agent': 'IPTV-App/1.0'})
    resp.raise_for_status()
    return resp.json()

async def fetch_iptv_data(force: bool = False):
    try:
        meta = await db.cache_meta.find_one({'type': 'iptv_channels'})
        if not force and meta:
            age_hours = (datetime.now(timezone.utc) - meta['updated_at'].replace(tzinfo=timezone.utc)).total_seconds() / 3600
            if age_hours < CACHE_TTL_HOURS:
                logger.info("IPTV cache is fresh, skipping fetch.")
                return

        logger.info("Fetching IPTV channels from iptv-org...")
        loop = asyncio.get_running_loop()

        channels_data = await loop.run_in_executor(None, lambda: _fetch_url(IPTV_CHANNELS_URL, 30))
        logger.info(f"Fetched {len(channels_data)} channels")

        streams_data = await loop.run_in_executor(None, lambda: _fetch_url(IPTV_STREAMS_URL, 120))
        logger.info(f"Fetched {len(streams_data)} streams")

        # Build streams lookup (first stream per channel)
        streams_map = {}
        for s in streams_data:
            cid = s.get('channel', '')
            if cid and cid not in streams_map and s.get('url', '').startswith('http'):
                streams_map[cid] = s['url']

        # Merge channels + streams
        merged = []
        for ch in channels_data:
            cid = ch.get('id', '')
            if cid not in streams_map:
                continue
            country = ch.get('country', '').upper()
            langs = ch.get('languages', [])
            is_arabic = country in ARABIC_COUNTRIES or 'ara' in langs
            cats = ch.get('categories', [])
            merged.append({
                'id': cid,
                'name': ch.get('name', 'Unknown'),
                'logo': ch.get('logo', ''),
                'category': cats[0] if cats else 'general',
                'categories': cats,
                'country': country,
                'languages': langs,
                'stream_url': streams_map[cid],
                'is_arabic': is_arabic,
            })

        # Bulk upsert into MongoDB
        await db.channels.delete_many({})
        if merged:
            await db.channels.insert_many(merged)
        await db.channels.create_index('id', unique=True)
        await db.channels.create_index('category')
        await db.channels.create_index('country')
        await db.channels.create_index('is_arabic')
        await db.channels.create_index('name')

        await db.cache_meta.update_one(
            {'type': 'iptv_channels'},
            {'$set': {'type': 'iptv_channels', 'updated_at': datetime.now(timezone.utc), 'count': len(merged)}},
            upsert=True
        )
        logger.info(f"Cached {len(merged)} channels with streams")

    except Exception as e:
        logger.error(f"Error fetching IPTV data: {e}")


# ─── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    await db.favorites.create_index('item_id')
    asyncio.create_task(fetch_iptv_data())


# ─── Channel Endpoints ─────────────────────────────────────────────────────────

@api_router.get("/channels/status")
async def channels_status():
    meta = await db.cache_meta.find_one({'type': 'iptv_channels'}, {'_id': 0})
    count = await db.channels.count_documents({})
    return {'loaded': count > 0, 'count': count, 'meta': meta}

@api_router.get("/channels")
async def get_channels(
    category: Optional[str] = None,
    country: Optional[str] = None,
    arabic_only: bool = True,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 60,
):
    query = {}
    if arabic_only:
        query['is_arabic'] = True
    if category and category != 'all':
        query['category'] = category
    if country:
        query['country'] = country.upper()
    if search:
        query['name'] = {'$regex': search, '$options': 'i'}

    total = await db.channels.count_documents(query)
    skip = (page - 1) * limit
    cursor = db.channels.find(query, {'_id': 0}).skip(skip).limit(limit)
    channels = await cursor.to_list(limit)
    return {'channels': channels, 'total': total, 'page': page, 'limit': limit}

@api_router.get("/channels/categories")
async def get_categories():
    try:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(None, lambda: _fetch_url(IPTV_CATEGORIES_URL, 10))
        return {'categories': data}
    except Exception:
        return {'categories': [
            {'id': 'all', 'name': 'الكل'},
            {'id': 'news', 'name': 'أخبار'},
            {'id': 'sports', 'name': 'رياضة'},
            {'id': 'entertainment', 'name': 'ترفيه'},
            {'id': 'movies', 'name': 'أفلام'},
            {'id': 'music', 'name': 'موسيقى'},
            {'id': 'kids', 'name': 'أطفال'},
            {'id': 'documentary', 'name': 'وثائقي'},
            {'id': 'religious', 'name': 'ديني'},
        ]}

@api_router.post("/channels/refresh")
async def refresh_channels(background_tasks: BackgroundTasks):
    background_tasks.add_task(fetch_iptv_data, True)
    return {'message': 'جاري تحديث البيانات في الخلفية'}


# ─── TMDB Movies ──────────────────────────────────────────────────────────────

def _tmdb_movie(m: dict) -> dict:
    return {
        'id': m['id'],
        'title': m.get('title') or m.get('original_title', ''),
        'original_title': m.get('original_title', ''),
        'poster': f"{TMDB_IMAGE_W500}{m['poster_path']}" if m.get('poster_path') else '',
        'backdrop': f"{TMDB_IMAGE_W1280}{m['backdrop_path']}" if m.get('backdrop_path') else '',
        'overview': m.get('overview', ''),
        'rating': round(m.get('vote_average', 0), 1),
        'release_date': m.get('release_date', ''),
        'genre_ids': m.get('genre_ids', []),
    }

def _tmdb_series(s: dict) -> dict:
    return {
        'id': s['id'],
        'name': s.get('name') or s.get('original_name', ''),
        'original_name': s.get('original_name', ''),
        'poster': f"{TMDB_IMAGE_W500}{s['poster_path']}" if s.get('poster_path') else '',
        'backdrop': f"{TMDB_IMAGE_W1280}{s['backdrop_path']}" if s.get('backdrop_path') else '',
        'overview': s.get('overview', ''),
        'rating': round(s.get('vote_average', 0), 1),
        'first_air_date': s.get('first_air_date', ''),
        'genre_ids': s.get('genre_ids', []),
    }

@api_router.get("/movies/popular")
async def get_popular_movies(page: int = 1, language: str = 'ar'):
    try:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(None, lambda: _fetch_url(
            f'{TMDB_BASE_URL}/movie/popular?api_key={TMDB_API_KEY}&language={language}&page={page}', 10))
        return {'movies': [_tmdb_movie(m) for m in data.get('results', [])],
                'total_pages': data.get('total_pages', 1), 'page': page}
    except Exception as e:
        logger.error(f"TMDB movies error: {e}")
        return {'movies': [], 'error': str(e)}

@api_router.get("/movies/search")
async def search_movies(query: str, page: int = 1):
    try:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(None, lambda: _fetch_url(
            f'{TMDB_BASE_URL}/search/movie?api_key={TMDB_API_KEY}&language=ar&query={requests.utils.quote(query)}&page={page}', 10))
        return {'movies': [_tmdb_movie(m) for m in data.get('results', [])],
                'total': data.get('total_results', 0)}
    except Exception as e:
        return {'movies': [], 'error': str(e)}

@api_router.get("/movies/genres")
async def get_movie_genres():
    try:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(None, lambda: _fetch_url(
            f'{TMDB_BASE_URL}/genre/movie/list?api_key={TMDB_API_KEY}&language=ar', 10))
        return {'genres': data.get('genres', [])}
    except Exception as e:
        return {'genres': [], 'error': str(e)}


# ─── TMDB Series ──────────────────────────────────────────────────────────────

@api_router.get("/series/popular")
async def get_popular_series(page: int = 1, language: str = 'ar'):
    try:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(None, lambda: _fetch_url(
            f'{TMDB_BASE_URL}/tv/popular?api_key={TMDB_API_KEY}&language={language}&page={page}', 10))
        return {'series': [_tmdb_series(s) for s in data.get('results', [])],
                'total_pages': data.get('total_pages', 1), 'page': page}
    except Exception as e:
        logger.error(f"TMDB series error: {e}")
        return {'series': [], 'error': str(e)}

@api_router.get("/series/search")
async def search_series(query: str, page: int = 1):
    try:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(None, lambda: _fetch_url(
            f'{TMDB_BASE_URL}/search/tv?api_key={TMDB_API_KEY}&language=ar&query={requests.utils.quote(query)}&page={page}', 10))
        return {'series': [_tmdb_series(s) for s in data.get('results', [])],
                'total': data.get('total_results', 0)}
    except Exception as e:
        return {'series': [], 'error': str(e)}


# ─── Unified Search ───────────────────────────────────────────────────────────

@api_router.get("/search")
async def unified_search(query: str):
    loop = asyncio.get_event_loop()
    results = {'channels': [], 'movies': [], 'series': []}
    try:
        cursor = db.channels.find({'name': {'$regex': query, '$options': 'i'}}, {'_id': 0}).limit(10)
        results['channels'] = await cursor.to_list(10)
    except Exception:
        pass
    try:
        data = await loop.run_in_executor(None, lambda: _fetch_url(
            f'{TMDB_BASE_URL}/search/movie?api_key={TMDB_API_KEY}&language=ar&query={requests.utils.quote(query)}&page=1', 10))
        results['movies'] = [_tmdb_movie(m) for m in data.get('results', [])[:8]]
    except Exception:
        pass
    try:
        data = await loop.run_in_executor(None, lambda: _fetch_url(
            f'{TMDB_BASE_URL}/search/tv?api_key={TMDB_API_KEY}&language=ar&query={requests.utils.quote(query)}&page=1', 10))
        results['series'] = [_tmdb_series(s) for s in data.get('results', [])[:8]]
    except Exception:
        pass
    return results


# ─── Favorites ────────────────────────────────────────────────────────────────

@api_router.get("/favorites")
async def get_favorites():
    favs = await db.favorites.find({}, {'_id': 0}).to_list(500)
    return {'favorites': favs}

@api_router.post("/favorites")
async def add_favorite(fav: FavoriteCreate):
    existing = await db.favorites.find_one({'item_id': fav.item_id, 'item_type': fav.item_type})
    if existing:
        return {'message': 'موجود بالفعل في المفضلة', 'already_exists': True}
    obj = Favorite(**fav.dict())
    await db.favorites.insert_one(obj.dict())
    return {'message': 'تمت الإضافة إلى المفضلة', 'id': obj.id}

@api_router.delete("/favorites/{item_id}")
async def remove_favorite(item_id: str):
    result = await db.favorites.delete_one({'item_id': item_id})
    if result.deleted_count:
        return {'message': 'تم الحذف من المفضلة'}
    raise HTTPException(status_code=404, detail='العنصر غير موجود في المفضلة')

@api_router.get("/favorites/check/{item_id}")
async def check_favorite(item_id: str):
    exists = await db.favorites.find_one({'item_id': item_id}, {'_id': 0})
    return {'is_favorite': exists is not None}


# ─── App Config ───────────────────────────────────────────────────────────────

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
