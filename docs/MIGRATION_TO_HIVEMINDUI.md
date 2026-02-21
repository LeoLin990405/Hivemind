# Migration from Original WebUI to HiveMindUI Monitor

**Date**: 2026-02-10

## Overview

The legacy `lib/web_server.py` dashboard (port `8080`) is now replaced by HiveMindUI integrated monitoring pages.

## Feature Mapping

| Original WebUI | HiveMindUI Location | Notes |
|---|---|---|
| Dashboard (`/`) | `/monitor` | Overview stats + provider performance |
| Tasks (`/tasks`) | `/monitor/tasks` | Task queue with status filters |
| Stats (`/stats`) | `/monitor` | Included in dashboard table |
| Cache (`/cache`) | `/monitor/cache` | Cache metrics + clear action |
| Health (`/health`) | Settings → Hivemind | Provider health status |
| Rate Limit (`/ratelimit`) | Settings → Hivemind → Rate Limiting | Per-provider reset |

## New Gateway Monitor APIs

HiveMindUI monitor pages call these Gateway endpoints:

- `GET /api/monitor/stats`
- `GET /api/monitor/cache/stats`
- `POST /api/monitor/cache/clear`
- `GET /api/monitor/tasks`
- `GET /api/monitor/ratelimit`
- `POST /api/monitor/ratelimit/{provider}/reset`

## Start Guide

1. Start Gateway

```bash
python3 -m lib.gateway.gateway_server --port 8765
```

2. Start HiveMindUI

```bash
cd HiveMindUI
npm start
```

3. Open **Monitor** from the left sidebar.

## Rollback

If needed, you can temporarily use the legacy dashboard:

```bash
python3 lib/web_server.py --port 8080
```
