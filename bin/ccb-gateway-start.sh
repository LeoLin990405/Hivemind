#!/bin/bash
# Gateway启动脚本，确保环境变量正确传递

cd ~/.local/share/codex-dual

# Load environment from shell config
if [[ -f "$HOME/.zshrc" ]]; then
    source "$HOME/.zshrc" 2>/dev/null || true
elif [[ -f "$HOME/.bashrc" ]]; then
    source "$HOME/.bashrc" 2>/dev/null || true
fi

# Fallback values if not set
export ANTIGRAVITY_API_KEY="${ANTIGRAVITY_API_KEY:-sk-89f5748589e74b55926fb869d53e01e6}"
export ANTIGRAVITY_BASE_URL="${ANTIGRAVITY_BASE_URL:-http://127.0.0.1:8045}"

# Start Gateway
exec python3 -m lib.gateway.gateway_server --port 8765
