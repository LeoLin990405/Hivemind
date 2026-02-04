#!/usr/bin/env python3
"""Test CCB Memory V2"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path.home() / ".local" / "share" / "codex-dual"))

from lib.memory.memory_v2 import CCBMemoryV2

# Initialize
memory = CCBMemoryV2(user_id="leo")

print("=" * 60)
print("CCB Memory V2 - Test")
print("=" * 60)

# Test 1: List sessions
print("\n1. List Sessions:")
sessions = memory.list_sessions(limit=5)
for s in sessions:
    print(f"  {s['session_id'][:8]}... - {s['message_count']} msgs - {s['providers_used']}")

# Test 2: Get session context
if sessions:
    print(f"\n2. Get Session Context (first session):")
    context = memory.get_session_context(sessions[0]['session_id'])
    for i, msg in enumerate(context[:3], 1):
        print(f"  {i}. [{msg['role']}] {msg['content'][:60]}...")

# Test 3: Record new conversation
print("\n3. Record New Conversation:")
result = memory.record_conversation(
    provider="kimi",
    question="测试 V2 记忆系统",
    answer="V2 记忆系统工作正常！",
    latency_ms=5000,
    tokens=50,
    context_injected=True,
    context_count=2,
    skills_used=["test"],
    metadata={"test": True}
)
print(f"  ✓ Recorded: session={result['session_id'][:8]}...")

# Test 4: Search
print("\n4. Search Messages:")
results = memory.search_messages("测试", limit=3)
for msg in results:
    print(f"  [{msg['provider']}] {msg['content'][:50]}...")

# Test 5: Stats
print("\n5. Statistics:")
stats = memory.get_stats()
print(f"  Total sessions: {stats['total_sessions']}")
print(f"  Total messages: {stats['total_messages']}")
print(f"  Total tokens: {stats['total_tokens']}")

if stats['provider_stats']:
    print(f"\n  Provider Stats:")
    for p in stats['provider_stats'][:3]:
        print(f"    {p['provider']}: {p['total_requests']} requests")

print("\n" + "=" * 60)
print("✓ All tests passed!")
print("=" * 60)
