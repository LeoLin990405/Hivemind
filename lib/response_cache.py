"""
Response Cache System for CCB

Caches AI provider responses to reduce redundant requests.
Supports exact match caching with configurable TTL.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, List, Dict, Any
import sqlite3
import time
import hashlib
from pathlib import Path
from contextlib import contextmanager


@dataclass
class CacheEntry:
    """A cached response entry."""
    key: str
    message_hash: str
    provider: str
    response: str
    created_at: float
    expires_at: float
    hit_count: int


@dataclass
class CacheStats:
    """Cache statistics."""
    total_entries: int
    total_hits: int
    total_misses: int
    hit_rate: float
    size_bytes: int
    oldest_entry: Optional[float]
    newest_entry: Optional[float]
    expired_entries: int = 0
    total_size_bytes: int = 0
    next_expiration: Optional[float] = None
    avg_ttl_remaining_s: Optional[float] = None


class ResponseCache:
    """
    SQLite-backed response cache for CCB.

    Caches provider responses to avoid redundant API calls.
    """

    def __init__(self, db_path: Optional[str] = None, default_ttl_s: int = 3600):
        """
        Initialize the response cache.

        Args:
            db_path: Path to SQLite database. Defaults to ~/.ccb_config/cache.db
            default_ttl_s: Default TTL in seconds (default: 1 hour)
        """
        if db_path:
            self.db_path = Path(db_path)
        else:
            self.db_path = Path.home() / ".ccb_config" / "cache.db"

        self.default_ttl_s = default_ttl_s

        # Ensure directory exists
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

        # In-memory stats tracking
        self._hits = 0
        self._misses = 0

    @contextmanager
    def _get_connection(self):
        """Get a database connection with row factory."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_db(self) -> None:
        """Initialize the SQLite database schema."""
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS response_cache (
                    key TEXT PRIMARY KEY,
                    message_hash TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    message TEXT NOT NULL,
                    response TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    expires_at REAL NOT NULL,
                    hit_count INTEGER DEFAULT 0
                )
            """)
            # Create indexes
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_cache_provider
                ON response_cache(provider)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_cache_expires
                ON response_cache(expires_at)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_cache_hash
                ON response_cache(message_hash)
            """)

            # Stats table for persistent hit/miss tracking
            conn.execute("""
                CREATE TABLE IF NOT EXISTS cache_stats (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    total_hits INTEGER DEFAULT 0,
                    total_misses INTEGER DEFAULT 0
                )
            """)
            # Initialize stats row if not exists
            conn.execute("""
                INSERT OR IGNORE INTO cache_stats (id, total_hits, total_misses)
                VALUES (1, 0, 0)
            """)

    def _hash_message(self, message: str, provider: Optional[str] = None) -> str:
        """Create a hash key for a message."""
        content = message.strip().lower()
        if provider:
            content = f"{provider}:{content}"
        return hashlib.sha256(content.encode()).hexdigest()[:32]

    def _make_key(self, message: str, provider: str) -> str:
        """Create a unique cache key."""
        return f"{provider}:{self._hash_message(message)}"

    def get(self, message: str, provider: Optional[str] = None) -> Optional[str]:
        """
        Get a cached response.

        Args:
            message: The message to look up
            provider: Optional provider filter (if None, matches any provider)

        Returns:
            Cached response or None if not found/expired
        """
        message_hash = self._hash_message(message)
        now = time.time()

        with self._get_connection() as conn:
            if provider:
                cursor = conn.execute("""
                    SELECT response, key FROM response_cache
                    WHERE message_hash = ? AND provider = ? AND expires_at > ?
                """, (message_hash, provider, now))
            else:
                cursor = conn.execute("""
                    SELECT response, key FROM response_cache
                    WHERE message_hash = ? AND expires_at > ?
                    ORDER BY created_at DESC LIMIT 1
                """, (message_hash, now))

            row = cursor.fetchone()

            if row:
                # Update hit count
                conn.execute("""
                    UPDATE response_cache SET hit_count = hit_count + 1
                    WHERE key = ?
                """, (row["key"],))
                # Update stats
                conn.execute("""
                    UPDATE cache_stats SET total_hits = total_hits + 1
                    WHERE id = 1
                """)
                self._hits += 1
                return row["response"]

            # Record miss
            conn.execute("""
                UPDATE cache_stats SET total_misses = total_misses + 1
                WHERE id = 1
            """)
            self._misses += 1
            return None

    def set(
        self,
        message: str,
        provider: str,
        response: str,
        ttl_s: Optional[int] = None,
    ) -> str:
        """
        Cache a response.

        Args:
            message: The original message
            provider: The provider that generated the response
            response: The response to cache
            ttl_s: Optional TTL override in seconds

        Returns:
            The cache key
        """
        key = self._make_key(message, provider)
        message_hash = self._hash_message(message)
        now = time.time()
        ttl = ttl_s if ttl_s is not None else self.default_ttl_s
        expires_at = now + ttl

        with self._get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO response_cache
                (key, message_hash, provider, message, response, created_at, expires_at, hit_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            """, (key, message_hash, provider, message, response, now, expires_at))

        return key

    def invalidate(self, pattern: Optional[str] = None, provider: Optional[str] = None) -> int:
        """
        Invalidate cache entries.

        Args:
            pattern: Optional message pattern to match (substring)
            provider: Optional provider filter

        Returns:
            Number of entries invalidated
        """
        with self._get_connection() as conn:
            if pattern and provider:
                cursor = conn.execute("""
                    DELETE FROM response_cache
                    WHERE provider = ? AND message LIKE ?
                """, (provider, f"%{pattern}%"))
            elif pattern:
                cursor = conn.execute("""
                    DELETE FROM response_cache
                    WHERE message LIKE ?
                """, (f"%{pattern}%",))
            elif provider:
                cursor = conn.execute("""
                    DELETE FROM response_cache
                    WHERE provider = ?
                """, (provider,))
            else:
                cursor = conn.execute("DELETE FROM response_cache")

            return cursor.rowcount

    def cleanup_expired(self) -> int:
        """
        Remove expired cache entries.

        Returns:
            Number of entries removed
        """
        now = time.time()

        with self._get_connection() as conn:
            cursor = conn.execute("""
                DELETE FROM response_cache
                WHERE expires_at < ?
            """, (now,))
            return cursor.rowcount

    def get_stats(self) -> CacheStats:
        """
        Get cache statistics.

        Returns:
            CacheStats object
        """
        with self._get_connection() as conn:
            # Get entry count and size (valid + expired)
            now = time.time()
            cursor = conn.execute("""
                SELECT
                    SUM(CASE WHEN expires_at > ? THEN 1 ELSE 0 END) as valid_count,
                    SUM(CASE WHEN expires_at <= ? THEN 1 ELSE 0 END) as expired_count,
                    COALESCE(SUM(CASE WHEN expires_at > ? THEN LENGTH(response) ELSE 0 END), 0) as valid_size,
                    COALESCE(SUM(LENGTH(response)), 0) as total_size,
                    MIN(CASE WHEN expires_at > ? THEN created_at END) as oldest,
                    MAX(CASE WHEN expires_at > ? THEN created_at END) as newest,
                    MIN(CASE WHEN expires_at > ? THEN expires_at END) as next_expiration,
                    AVG(CASE WHEN expires_at > ? THEN (expires_at - ?) END) as avg_ttl_remaining
                FROM response_cache
            """, (now, now, now, now, now, now, now, now))
            row = cursor.fetchone()

            # Get persistent stats
            cursor = conn.execute("""
                SELECT total_hits, total_misses FROM cache_stats WHERE id = 1
            """)
            stats_row = cursor.fetchone()

            total_hits = stats_row["total_hits"] if stats_row else 0
            total_misses = stats_row["total_misses"] if stats_row else 0
            total = total_hits + total_misses

            return CacheStats(
                total_entries=row["valid_count"] or 0,
                total_hits=total_hits,
                total_misses=total_misses,
                hit_rate=total_hits / total if total > 0 else 0.0,
                size_bytes=row["valid_size"] or 0,
                oldest_entry=row["oldest"],
                newest_entry=row["newest"],
                expired_entries=row["expired_count"] or 0,
                total_size_bytes=row["total_size"] or 0,
                next_expiration=row["next_expiration"],
                avg_ttl_remaining_s=row["avg_ttl_remaining"],
            )

    def list_entries(
        self,
        provider: Optional[str] = None,
        limit: int = 50,
        include_expired: bool = False,
    ) -> List[CacheEntry]:
        """
        List cache entries.

        Args:
            provider: Optional provider filter
            limit: Maximum entries to return
            include_expired: Whether to include expired entries

        Returns:
            List of CacheEntry objects
        """
        now = time.time()

        query = "SELECT * FROM response_cache WHERE 1=1"
        params: List[Any] = []

        if not include_expired:
            query += " AND expires_at > ?"
            params.append(now)

        if provider:
            query += " AND provider = ?"
            params.append(provider)

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        with self._get_connection() as conn:
            cursor = conn.execute(query, params)
            return [
                CacheEntry(
                    key=row["key"],
                    message_hash=row["message_hash"],
                    provider=row["provider"],
                    response=row["response"],
                    created_at=row["created_at"],
                    expires_at=row["expires_at"],
                    hit_count=row["hit_count"],
                )
                for row in cursor.fetchall()
            ]

    def clear(self) -> int:
        """
        Clear all cache entries.

        Returns:
            Number of entries cleared
        """
        with self._get_connection() as conn:
            cursor = conn.execute("DELETE FROM response_cache")
            # Reset stats
            conn.execute("""
                UPDATE cache_stats SET total_hits = 0, total_misses = 0
                WHERE id = 1
            """)
            return cursor.rowcount

    def get_entry(self, key: str) -> Optional[CacheEntry]:
        """
        Get a specific cache entry by key.

        Args:
            key: The cache key

        Returns:
            CacheEntry or None
        """
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT * FROM response_cache WHERE key = ?
            """, (key,))
            row = cursor.fetchone()

            if row:
                return CacheEntry(
                    key=row["key"],
                    message_hash=row["message_hash"],
                    provider=row["provider"],
                    response=row["response"],
                    created_at=row["created_at"],
                    expires_at=row["expires_at"],
                    hit_count=row["hit_count"],
                )
            return None

    def touch(self, key: str, extend_ttl_s: Optional[int] = None) -> bool:
        """
        Touch a cache entry to extend its TTL.

        Args:
            key: The cache key
            extend_ttl_s: Optional TTL extension (default: original TTL)

        Returns:
            True if entry was touched, False if not found
        """
        ttl = extend_ttl_s if extend_ttl_s is not None else self.default_ttl_s
        new_expires = time.time() + ttl

        with self._get_connection() as conn:
            cursor = conn.execute("""
                UPDATE response_cache SET expires_at = ?
                WHERE key = ?
            """, (new_expires, key))
            return cursor.rowcount > 0
