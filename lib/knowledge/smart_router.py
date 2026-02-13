"""Smart routing for NotebookLM notebooks based on lightweight semantic scoring."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import re
from typing import Any, Dict, Iterable, List, Optional


_STOPWORDS = {
    "the",
    "a",
    "an",
    "to",
    "for",
    "of",
    "in",
    "on",
    "and",
    "or",
    "is",
    "are",
    "what",
    "how",
    "why",
    "when",
    "where",
    "who",
    "which",
    "请",
    "帮",
    "我",
    "一下",
    "什么",
    "怎么",
    "如何",
    "关于",
    "一个",
}


@dataclass
class SmartRouteResult:
    notebook: Optional[Dict[str, Any]]
    score: float
    candidates: List[Dict[str, Any]]


class SmartNotebookRouter:
    """Notebook selector based on notebook metadata.

    This router intentionally uses deterministic lexical scoring to keep
    behavior explainable and dependency-free.
    """

    def __init__(self, recency_boost_days: int = 14):
        self.recency_boost_days = max(1, int(recency_boost_days))

    def route(self, question: str, notebooks: Iterable[Dict[str, Any]], notebook_id: Optional[str] = None) -> SmartRouteResult:
        notebook_list = [dict(item) for item in notebooks]
        if not notebook_list:
            return SmartRouteResult(notebook=None, score=0.0, candidates=[])

        if notebook_id:
            for item in notebook_list:
                if str(item.get("notebook_id") or item.get("id") or "") == notebook_id:
                    return SmartRouteResult(notebook=item, score=1.0, candidates=[item])

        keywords = self._extract_keywords(question)
        scored = []
        for item in notebook_list:
            score = self._score_notebook(item, keywords)
            scored.append((score, item))

        scored.sort(key=lambda row: row[0], reverse=True)
        best_score, best_notebook = scored[0]
        candidates = [
            {
                "notebook_id": str(nb.get("notebook_id") or nb.get("id") or ""),
                "title": nb.get("title"),
                "category": nb.get("category"),
                "score": float(round(score, 4)),
            }
            for score, nb in scored[:5]
            if score > 0
        ]

        if best_score <= 0:
            best_notebook = self._fallback_latest(notebook_list)
            best_score = 0.05 if best_notebook else 0.0

        return SmartRouteResult(notebook=best_notebook, score=float(round(best_score, 4)), candidates=candidates)

    def _extract_keywords(self, text: str) -> List[str]:
        tokens = re.findall(r"[\w\u4e00-\u9fff]+", (text or "").lower())
        keywords: List[str] = []
        for token in tokens:
            if len(token) < 2 or token in _STOPWORDS:
                continue
            keywords.append(token)
        return keywords

    def _score_notebook(self, notebook: Dict[str, Any], keywords: List[str]) -> float:
        title = str(notebook.get("title") or "").lower()
        category = str(notebook.get("category") or "").lower()

        lexical_score = 0.0
        for keyword in keywords:
            if keyword in title:
                lexical_score += 2.0
            if keyword in category:
                lexical_score += 1.0

        source_count = int(notebook.get("source_count") or 0)
        max_sources = max(1, int(notebook.get("max_sources") or 50))
        utilization = min(source_count / max_sources, 1.0)

        recency = self._recency_score(str(notebook.get("created") or notebook.get("created_at") or ""))

        return lexical_score + (utilization * 0.4) + recency

    def _recency_score(self, iso_like: str) -> float:
        parsed = self._parse_datetime(iso_like)
        if not parsed:
            return 0.0

        now = datetime.now(parsed.tzinfo)
        age_days = max((now - parsed).days, 0)
        if age_days > self.recency_boost_days:
            return 0.0
        return (self.recency_boost_days - age_days) / self.recency_boost_days * 0.3

    def _fallback_latest(self, notebooks: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        with_ts = []
        for nb in notebooks:
            dt = self._parse_datetime(str(nb.get("created") or nb.get("created_at") or ""))
            with_ts.append((dt or datetime.min, nb))
        with_ts.sort(key=lambda row: row[0], reverse=True)
        return with_ts[0][1] if with_ts else None

    def _parse_datetime(self, value: str) -> Optional[datetime]:
        if not value:
            return None

        candidate = value.strip().replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(candidate)
        except ValueError:
            pass

        for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(candidate, fmt)
            except ValueError:
                continue

        return None
