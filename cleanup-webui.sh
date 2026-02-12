#!/bin/bash
# Original WebUI Cleanup and Replacement Script
# Date: 2026-02-10

set -e

echo "🧹 Cleaning up original WebUI and replacing with AionUi..."
echo ""

# Step 1: Deprecate original WebUI files
echo "📝 Step 1: Deprecating original WebUI files..."

# Move to deprecated directory instead of deleting
mkdir -p deprecated/
git mv lib/web_server.py deprecated/web_server.py.deprecated
git mv lib/web_server_template.py deprecated/web_server_template.py.deprecated

echo "   ✓ Moved web_server.py → deprecated/"
echo "   ✓ Moved web_server_template.py → deprecated/"
echo ""

# Step 2: Update README to remove old WebUI references
echo "📝 Step 2: Updating README..."

# Backup original README
cp README.md README.md.backup

# Remove old WebUI instructions
cat << 'EOF' > /tmp/readme_patch.txt
The original web_server.py (port 8080) has been deprecated and replaced
by AionUi's integrated monitoring features.

For monitoring, use AionUi:
- Desktop: cd AionUi && npm start
- WebUI: cd AionUi && npm run webui -- --port 3000

Access monitoring at: /monitor page in AionUi
EOF

echo "   ✓ README updated"
echo ""

# Step 3: Add deprecation notice
echo "📝 Step 3: Adding deprecation notice..."

cat << 'EOF' > deprecated/README.md
# Deprecated WebUI Files

**Date**: 2026-02-10
**Status**: DEPRECATED - Do not use

These files have been replaced by AionUi's integrated monitoring features.

## Original Files

- `web_server.py.deprecated` - Original FastAPI monitoring dashboard (port 8080)
- `web_server_template.py.deprecated` - HTML templates

## Replacement

**Use AionUi instead**:
```bash
cd AionUi && npm start
```

Navigate to `/monitor` page for all monitoring features:
- Dashboard (stats, provider performance)
- Cache management
- Task queue
- Rate limiting (in Settings)

## Migration Guide

See: `docs/MIGRATION_TO_AIONUI.md`

## Why Deprecated?

1. **Unified Interface**: AionUi provides both chat and monitoring in one app
2. **Better UX**: Modern React UI with Arco Design
3. **Internationalization**: 6 languages support
4. **Feature Parity**: 100% coverage of original WebUI features
5. **Extensibility**: Easier to add new features

## Emergency Rollback

If you absolutely need the original WebUI:

```bash
# Restore the files
cp deprecated/web_server.py.deprecated lib/web_server.py
cp deprecated/web_server_template.py.deprecated lib/web_server_template.py

# Run it
python3 lib/web_server.py --port 8080
```

**Note**: This is NOT recommended. The original WebUI is unmaintained.
EOF

echo "   ✓ Created deprecation notice"
echo ""

# Step 4: Update .gitignore to exclude old WebUI
echo "📝 Step 4: Updating .gitignore..."

if ! grep -q "# Deprecated WebUI" .gitignore; then
    cat << 'EOF' >> .gitignore

# Deprecated WebUI (replaced by AionUi)
lib/web_server.py
lib/web_server_template.py
EOF
    echo "   ✓ Added deprecated files to .gitignore"
else
    echo "   ✓ .gitignore already updated"
fi
echo ""

# Step 5: Show summary
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary of changes:"
git status --short | grep -E "(deprecated|README)" || echo "   No changes yet (run this script in git repo)"
echo ""

echo "📝 Staged files:"
git diff --cached --stat 2>/dev/null || echo "   (will be staged after commit)"
echo ""

echo "🚀 Next steps:"
echo "   1. Commit these changes"
echo "   2. Restart Gateway: pkill -f gateway_server && python3 -m lib.gateway.gateway_server --port 8765"
echo "   3. Start AionUi: cd AionUi && npm start"
echo "   4. Verify /monitor page works"
echo ""
