"""NotebookLM source rotation utilities for Knowledge Hub v2.1."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional


@dataclass(frozen=True)
class SourceRecord:
    """Normalized source record used for rotation decisions."""

    source_id: str
    title: str
    created_at: Optional[datetime]
    last_used_at: Optional[datetime]
    usage_count: int
    raw: Dict[str, Any]


def _parse_datetime(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        normalized = value.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(normalized)
        except ValueError:
            return None
    return None


class NotebookLMSourceManager:
    """Smart source manager implementing the v2.1 rotation strategy."""

    def __init__(self, max_sources: int = 50):
        self.max_sources = max(1, int(max_sources))

    def normalize_source(self, source: Dict[str, Any]) -> SourceRecord:
        """Convert a provider source payload to a normalized source record."""

        source_id = str(source.get("id") or source.get("source_id") or "")
        title = str(source.get("title") or source.get("name") or source_id)
        usage_count = int(source.get("usage_count") or source.get("access_count") or 0)

        created_at = _parse_datetime(
            source.get("created_time")
            or source.get("created_at")
            or source.get("created")
        )
        last_used_at = _parse_datetime(
            source.get("last_accessed")
            or source.get("last_used")
            or source.get("updated_at")
        )

        return SourceRecord(
            source_id=source_id,
            title=title,
            created_at=created_at,
            last_used_at=last_used_at,
            usage_count=usage_count,
            raw=source,
        )

    def find_least_used_source(self, sources: List[Dict[str, Any]]) -> Optional[SourceRecord]:
        """Find the least-used (then oldest) source for rotation."""

        if not sources:
            return None

        normalized = [self.normalize_source(source) for source in sources]

        return min(
            normalized,
            key=lambda record: (
                record.usage_count,
                record.last_used_at or datetime.min,
                record.created_at or datetime.min,
            ),
        )

    def add_source_with_rotation(
        self,
        notebook_id: str,
        new_source: Any,
        *,
        get_sources: Callable[[str], List[Dict[str, Any]]],
        add_source: Callable[[str, Any], Dict[str, Any]],
        remove_source: Callable[[str, str], Any],
        backup_to_obsidian: Optional[Callable[[str, SourceRecord], Any]] = None,
    ) -> Dict[str, Any]:
        """Add a new source and rotate the least-used source when near limit."""

        sources = list(get_sources(notebook_id) or [])

        if len(sources) >= self.max_sources:
            least_used = self.find_least_used_source(sources)
            if least_used and least_used.source_id:
                if backup_to_obsidian is not None:
                    backup_to_obsidian(notebook_id, least_used)
                remove_source(notebook_id, least_used.source_id)

        return add_source(notebook_id, new_source)
