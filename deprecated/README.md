# Deprecated WebUI Files

**Date**: 2026-02-10
**Status**: ⚠️ DEPRECATED - Do not use

These files have been **replaced by HiveMindUI's integrated monitoring features**.

## Original Files

- `web_server.py.deprecated` - Original FastAPI monitoring dashboard (port 8080)
- `web_server_template.py.deprecated` - HTML templates

## Replacement: HiveMindUI Monitor

**Use HiveMindUI instead**:
```bash
cd HiveMindUI && npm start
```

Navigate to **`/monitor`** page for all monitoring features:
- 📊 **Dashboard** - Overview stats, provider performance table
- 💾 **Cache Management** - Cache stats, clear cache button
- 📋 **Task Queue** - Task list with status filtering
- ⚙️ **Rate Limiting** - In Settings > Hivemind > Rate Limit

## Why Deprecated?

| Reason | Benefit |
|--------|---------|
| **Unified Interface** | Chat + monitoring in one app |
| **Better UX** | Modern React UI (Arco Design) vs HTML templates |
| **Internationalization** | 6 languages vs English only |
| **Feature Parity** | 100% coverage of original features |
| **Extensibility** | Easy to add charts, alerts, etc. |

## Migration Guide

See: [`docs/MIGRATION_TO_HIVEMINDUI.md`](../docs/MIGRATION_TO_HIVEMINDUI.md)

## Emergency Rollback (NOT RECOMMENDED)

If you absolutely need the original WebUI:

```bash
# 1. Restore files
cp deprecated/web_server.py.deprecated lib/web_server.py
cp deprecated/web_server_template.py.deprecated lib/web_server_template.py

# 2. Run it
python3 lib/web_server.py --port 8080
```

⚠️ **Warning**: The original WebUI is **unmaintained** and will not receive updates.

## Timeline

- **2026-02-09**: HiveMindUI integration started (Plan A+B)
- **2026-02-10**: Monitoring extension completed (Plan C + Monitor pages)
- **2026-02-10**: Original WebUI deprecated

---

For questions or issues, see: [HIVEMINDUI_VS_WEBUI_COMPARISON.md](../docs/HIVEMINDUI_VS_WEBUI_COMPARISON.md)
