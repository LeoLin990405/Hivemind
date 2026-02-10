"""Monitoring routes for AionUi Gateway monitor pages."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

try:
    from fastapi import APIRouter, Depends, HTTPException, Query, Request

    HAS_FASTAPI = True
except ImportError:  # pragma: no cover - optional FastAPI dependency
    HAS_FASTAPI = False


if HAS_FASTAPI:
    router = APIRouter()
else:  # pragma: no cover - API unavailable without FastAPI
    router = None


def get_config(request: Request):
    return request.app.state.config


def get_store(request: Request):
    return request.app.state.store


def get_cache_manager(request: Request):
    return getattr(request.app.state, "cache_manager", None)


def _to_iso(timestamp: Optional[float]) -> Optional[str]:
    if timestamp is None:
        return None
    return datetime.fromtimestamp(float(timestamp), tz=timezone.utc).isoformat()


def _normalize_task_status(status_value: str) -> str:
    if status_value in {"queued", "processing"}:
        return "pending"
    if status_value == "completed":
        return "completed"
    return "failed"


def _get_provider_rate_limiter():
    try:
        from lib.rate_limiter import get_rate_limiter
    except ImportError:
        try:
            from rate_limiter import get_rate_limiter
        except ImportError:
            return None

    return get_rate_limiter()


if HAS_FASTAPI:
    @router.get("/api/monitor/stats")
    async def get_monitor_stats(
        hours: int = Query(24, ge=1, le=168),
        config=Depends(get_config),
        store=Depends(get_store),
    ) -> Dict[str, Any]:
        """Get aggregated provider performance stats for monitor dashboard."""
        providers = []
        total_requests = 0
        total_successes = 0

        for provider_name in config.providers.keys():
            metrics = store.get_provider_metrics(provider_name, hours=hours)

            requests = int(metrics.get("total_requests", 0) or 0)
            successful = int(
                metrics.get(
                    "successful_requests",
                    round(requests * float(metrics.get("success_rate", 1.0) or 1.0)),
                )
                or 0
            )
            successful = max(0, min(successful, requests))
            errors = max(0, requests - successful)

            providers.append(
                {
                    "provider": provider_name,
                    "requests": requests,
                    "success_rate": float(metrics.get("success_rate", 1.0) or 1.0),
                    "avg_latency_ms": float(metrics.get("avg_latency_ms", 0.0) or 0.0),
                    "errors": errors,
                    "enabled": bool(getattr(config.providers.get(provider_name), "enabled", True)),
                }
            )

            total_requests += requests
            total_successes += successful

        providers.sort(key=lambda item: item["requests"], reverse=True)

        return {
            "total_requests": total_requests,
            "overall_success_rate": (total_successes / total_requests) if total_requests > 0 else 1.0,
            "providers": providers,
            "hours": hours,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


    @router.get("/api/monitor/cache/stats")
    async def get_monitor_cache_stats(
        cache_manager=Depends(get_cache_manager),
    ) -> Dict[str, Any]:
        """Get monitor cache summary metrics."""
        if not cache_manager:
            return {
                "enabled": False,
                "total_entries": 0,
                "hit_rate": 0.0,
                "total_hits": 0,
                "total_misses": 0,
            }

        stats = cache_manager.get_stats()
        return {
            "enabled": True,
            "total_entries": stats.total_entries,
            "hit_rate": stats.hit_rate,
            "total_hits": stats.hits,
            "total_misses": stats.misses,
        }


    @router.post("/api/monitor/cache/clear")
    async def clear_monitor_cache(
        cache_manager=Depends(get_cache_manager),
    ) -> Dict[str, Any]:
        """Clear monitor cache entries."""
        if not cache_manager:
            raise HTTPException(status_code=400, detail="Cache not enabled")

        cleared = cache_manager.clear()
        return {
            "status": "ok",
            "message": "Cache cleared",
            "cleared": cleared,
        }


    @router.get("/api/monitor/tasks")
    async def get_monitor_tasks(
        limit: int = Query(20, ge=1, le=200),
        store=Depends(get_store),
    ) -> Dict[str, Any]:
        """List recent gateway tasks in monitor-friendly format."""
        requests = store.list_requests(
            limit=limit,
            offset=0,
            order_by="created_at",
            order_desc=True,
        )

        tasks = []
        for request in requests:
            response = store.get_response(request.id)
            tasks.append(
                {
                    "id": request.id,
                    "status": _normalize_task_status(request.status.value),
                    "provider": request.provider,
                    "created_at": _to_iso(request.created_at),
                    "completed_at": _to_iso(request.completed_at),
                    "error": response.error if response else None,
                }
            )

        return {"tasks": tasks}


    @router.get("/api/monitor/ratelimit")
    async def get_monitor_rate_limit(
        config=Depends(get_config),
    ) -> Dict[str, Any]:
        """Get per-provider rate-limit state for monitor settings panel."""
        limiter = _get_provider_rate_limiter()
        if limiter is None:
            return {}

        status: Dict[str, Any] = {}
        now_ts = datetime.now(timezone.utc).timestamp()

        for provider_name in config.providers.keys():
            provider_stats = limiter.get_stats(provider_name)
            reset_at = now_ts + provider_stats.wait_time_s if provider_stats.wait_time_s > 0 else None

            status[provider_name] = {
                "limit": provider_stats.limit_rpm,
                "remaining": int(provider_stats.available_tokens),
                "reset_at": _to_iso(reset_at),
                "is_limited": provider_stats.is_limited,
                "current_rpm": provider_stats.current_rpm,
                "total_limited": provider_stats.total_limited,
            }

        return status


    @router.post("/api/monitor/ratelimit/{provider}/reset")
    async def reset_monitor_rate_limit(
        provider: str,
        config=Depends(get_config),
    ) -> Dict[str, Any]:
        """Reset per-provider rate-limit counters."""
        if provider not in config.providers:
            raise HTTPException(status_code=404, detail=f"Provider '{provider}' not found")

        limiter = _get_provider_rate_limiter()
        if limiter is None:
            raise HTTPException(status_code=500, detail="Rate limiter not available")

        limiter.reset(provider)
        return {
            "status": "ok",
            "provider": provider,
        }
