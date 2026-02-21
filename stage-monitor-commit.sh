#!/bin/bash
# HiveMindUI Monitoring Extension - Staged Commit Script
# Generated: 2026-02-10

set -e

echo "🔍 Staging files for HiveMindUI monitoring extension..."

# Backend: Gateway monitoring API
echo "📦 Backend..."
git add lib/gateway/routes/monitor.py
git add lib/gateway/routes/__init__.py
git add lib/gateway/app.py
git add tests/test_routes_monitor.py

# Frontend: HiveMindUI monitoring pages
echo "🎨 Frontend - Services & Hooks..."
git add HiveMindUI/src/renderer/services/GatewayMonitorService.ts
git add HiveMindUI/src/renderer/hooks/useGatewayStats.ts

echo "🎨 Frontend - Monitor Pages..."
git add HiveMindUI/src/renderer/pages/monitor/

echo "🎨 Frontend - Settings Extension..."
git add HiveMindUI/src/renderer/components/SettingsModal/contents/RateLimitControl.tsx
git add HiveMindUI/src/renderer/components/SettingsModal/contents/HivemindModalContent.tsx

echo "🎨 Frontend - Routing..."
git add HiveMindUI/src/renderer/router.tsx
git add HiveMindUI/src/renderer/sider.tsx

echo "🌐 Frontend - i18n..."
git add HiveMindUI/src/renderer/i18n/locales/en-US.json
git add HiveMindUI/src/renderer/i18n/locales/zh-CN.json
git add HiveMindUI/src/renderer/i18n/locales/zh-TW.json
git add HiveMindUI/src/renderer/i18n/locales/ja-JP.json
git add HiveMindUI/src/renderer/i18n/locales/ko-KR.json
git add HiveMindUI/src/renderer/i18n/locales/tr-TR.json

# Documentation
echo "📚 Documentation..."
git add docs/MIGRATION_TO_HIVEMINDUI.md
git add docs/HIVEMINDUI_VS_WEBUI_COMPARISON.md
git add README.md

echo ""
echo "✅ Files staged successfully!"
echo ""
echo "📊 Summary:"
git diff --cached --stat
echo ""
echo "🏷️  Suggested commit message:"
echo ""
cat << 'EOF'
feat(monitor): integrate Gateway monitoring into HiveMindUI

Replace standalone web_server.py with unified monitoring in HiveMindUI.

Backend (Gateway):
- Add 6 monitoring API endpoints: /api/monitor/{stats,cache,tasks,ratelimit}
- New routes module: lib/gateway/routes/monitor.py
- Integrate route registration in app.py
- Add pytest coverage for monitor routes

Frontend (HiveMindUI):
- Add GatewayMonitorService for API calls
- Add useGatewayStats hook for data management
- Add 4 monitor pages: Dashboard, CacheManager, TaskQueue, MonitorLayout
- Add RateLimitControl component in Hivemind settings
- Integrate /monitor routing and sidebar navigation
- Add i18n keys for monitor namespace (6 locales)

Documentation:
- Add MIGRATION_TO_HIVEMINDUI.md guide
- Add HIVEMINDUI_VS_WEBUI_COMPARISON.md analysis
- Update README with monitoring instructions

Testing:
- pytest: 4 tests passed for monitor routes
- ESLint: passed for HiveMindUI components
- Changes synced to /Users/leo/Desktop/HiveMindUI

This deprecates lib/web_server.py (port 8080) in favor of the
integrated HiveMindUI monitoring interface, providing a unified
platform for both AI chat and Gateway administration.
EOF
echo ""
echo "⚠️  Files NOT staged (runtime/session):"
echo "   - .ccb_config/.claude-session"
echo "   - .ccb_config/.codex-session"
echo "   - bin/* (CLI tools)"
echo "   - gateway_state.db"
echo ""
echo "📝 To commit, run:"
echo "   git commit -F <(cat << 'EOF'"
echo "   [paste commit message above]"
echo "   EOF"
echo "   )"
echo ""
echo "Or simply run: git commit"
echo "(The staged changes are ready)"
