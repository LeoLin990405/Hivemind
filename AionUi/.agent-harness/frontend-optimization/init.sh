#!/bin/bash

# HiveMind Frontend Optimization - Development Environment Startup
# Based on Anthropic Long-Running Agents best practices

set -e

PROJECT_ROOT="/Users/leo/.local/share/codex-dual/AionUi"
HARNESS_DIR="$PROJECT_ROOT/.agent-harness/frontend-optimization"

echo "🎨 HiveMind Frontend Optimization Environment"
echo "=============================================="
echo ""

# 1. Verify working directory
echo "📁 Working Directory:"
cd "$PROJECT_ROOT"
pwd

# 2. Check git status
echo ""
echo "📊 Git Status:"
git status --short 2>/dev/null || echo "Not a git repo or git not available"
git log --oneline -1 2>/dev/null || echo "No commits yet"

# 3. Create screenshot directories
mkdir -p "$HARNESS_DIR/screenshots/before"
mkdir -p "$HARNESS_DIR/screenshots/after"

# 4. Check if dev server is already running
echo ""
echo "🖥️  Dev Server Status:"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Dev server already running at http://localhost:3000"
else
    echo "⏳ Starting development server..."
    cd "$PROJECT_ROOT"

    # Start Vite dev server in background
    npm run dev:web &
    DEV_PID=$!

    echo "   Waiting for server to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "✅ Dev server ready at http://localhost:3000 (PID: $DEV_PID)"
            break
        fi
        sleep 1
    done

    if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "❌ Dev server failed to start"
        exit 1
    fi
fi

# 5. Show next feature to work on
echo ""
echo "🎯 Next Feature to Optimize:"
if command -v jq > /dev/null 2>&1; then
    jq -r '.pages[].features[] | select(.passes == false) | "  [\(.id)] \(.description) (Owner: \(.owner))"' \
        "$HARNESS_DIR/feature_list.json" | head -5
else
    echo "   Install jq for better feature parsing: brew install jq"
    grep -A 2 '"passes": false' "$HARNESS_DIR/feature_list.json" | head -15
fi

# 6. Show progress summary
echo ""
echo "📈 Progress Summary:"
if command -v jq > /dev/null 2>&1; then
    TOTAL=$(jq '.summary.total_features' "$HARNESS_DIR/feature_list.json")
    PASSING=$(jq '[.pages[].features[], .global_features[]] | map(select(.passes == true)) | length' "$HARNESS_DIR/feature_list.json")
    echo "   Total: $TOTAL | Completed: $PASSING | Remaining: $((TOTAL - PASSING))"
fi

echo ""
echo "=============================================="
echo "✅ Environment ready!"
echo ""
echo "Teammate Workflow:"
echo "1. Read feature_list.json to find your next task"
echo "2. Take BEFORE screenshot (if applicable)"
echo "3. Implement the optimization"
echo "4. Take AFTER screenshot"
echo "5. Verify with E2E test"
echo "6. Update feature passes: true"
echo "7. Git commit with clean message"
echo ""
echo "Screenshot directories:"
echo "  Before: $HARNESS_DIR/screenshots/before/"
echo "  After:  $HARNESS_DIR/screenshots/after/"
echo "=============================================="
