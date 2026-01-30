"""
Context7 MCP Client for CCB

Provides integration with Context7 for fetching up-to-date library documentation.
This helps reduce AI hallucinations by providing accurate, current documentation.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, List, Dict, Any
import subprocess
import json
import time
from pathlib import Path


@dataclass
class LibraryInfo:
    """Information about a resolved library."""
    library_id: str
    name: str
    description: str
    code_snippets: int
    source: str
    benchmark_score: Optional[int] = None


@dataclass
class DocResult:
    """Result from a documentation query."""
    library_id: str
    query: str
    content: str
    sources: List[str]
    cached: bool = False


class Context7Client:
    """
    Client for Context7 MCP documentation lookup.

    Uses the Context7 MCP server to resolve library IDs and query documentation.
    """

    def __init__(self, cache_ttl_s: int = 3600, max_results: int = 5):
        """
        Initialize the Context7 client.

        Args:
            cache_ttl_s: Cache TTL in seconds (default: 1 hour)
            max_results: Maximum results to return (default: 5)
        """
        self.cache_ttl_s = cache_ttl_s
        self.max_results = max_results
        self._cache: Dict[str, tuple[float, Any]] = {}

    def _get_cached(self, key: str) -> Optional[Any]:
        """Get a cached value if not expired."""
        if key in self._cache:
            timestamp, value = self._cache[key]
            if time.time() - timestamp < self.cache_ttl_s:
                return value
            del self._cache[key]
        return None

    def _set_cached(self, key: str, value: Any) -> None:
        """Set a cached value."""
        self._cache[key] = (time.time(), value)

    def resolve_library(self, library_name: str, query: str = "") -> Optional[LibraryInfo]:
        """
        Resolve a library name to a Context7-compatible library ID.

        Args:
            library_name: Name of the library to resolve (e.g., "react", "pandas")
            query: Optional query context for better matching

        Returns:
            LibraryInfo if found, None otherwise
        """
        cache_key = f"resolve:{library_name}:{query}"
        cached = self._get_cached(cache_key)
        if cached:
            return cached

        # This would normally call the Context7 MCP server
        # For now, return a placeholder that indicates the feature is available
        # but requires MCP server configuration
        return None

    def query_docs(self, library_id: str, query: str) -> Optional[DocResult]:
        """
        Query documentation for a library.

        Args:
            library_id: Context7 library ID (e.g., "/vercel/next.js")
            query: The question or topic to search for

        Returns:
            DocResult with documentation content, or None if not found
        """
        cache_key = f"docs:{library_id}:{query}"
        cached = self._get_cached(cache_key)
        if cached:
            cached.cached = True
            return cached

        # This would normally call the Context7 MCP server
        # For now, return None indicating MCP server needs configuration
        return None

    def search_docs(self, library_name: str, query: str) -> Optional[DocResult]:
        """
        Convenience method to resolve library and query docs in one call.

        Args:
            library_name: Name of the library
            query: The question or topic to search for

        Returns:
            DocResult with documentation content, or None if not found
        """
        # First resolve the library
        lib_info = self.resolve_library(library_name, query)
        if not lib_info:
            return None

        # Then query the docs
        return self.query_docs(lib_info.library_id, query)

    def clear_cache(self) -> int:
        """
        Clear the documentation cache.

        Returns:
            Number of entries cleared
        """
        count = len(self._cache)
        self._cache.clear()
        return count

    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dict with cache stats
        """
        now = time.time()
        valid_entries = sum(
            1 for ts, _ in self._cache.values()
            if now - ts < self.cache_ttl_s
        )
        return {
            "total_entries": len(self._cache),
            "valid_entries": valid_entries,
            "expired_entries": len(self._cache) - valid_entries,
            "cache_ttl_s": self.cache_ttl_s,
        }
