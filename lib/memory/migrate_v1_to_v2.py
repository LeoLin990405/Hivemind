#!/usr/bin/env python3
"""
Migrate CCB Memory from v1 to v2

迁移策略：
1. 读取 v1 数据库 (ccb_memory.db)
2. 创建 v2 数据库 (ccb_memory_v2.db)
3. 转换数据结构并导入
4. 保留 v1 数据库作为备份
"""

import sqlite3
import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import Dict, List


def migrate_v1_to_v2(
    v1_db_path: str = None,
    v2_db_path: str = None,
    user_id: str = "leo"
):
    """Migrate from v1 to v2 schema

    Args:
        v1_db_path: Path to v1 database
        v2_db_path: Path to v2 database
        user_id: User ID for migration
    """
    if v1_db_path is None:
        v1_db_path = Path.home() / ".ccb" / "ccb_memory.db"
    if v2_db_path is None:
        v2_db_path = Path.home() / ".ccb" / "ccb_memory_v2.db"

    print(f"Migrating {v1_db_path} -> {v2_db_path}")
    print(f"User ID: {user_id}\n")

    # Connect to v1
    v1_conn = sqlite3.connect(v1_db_path)
    v1_cursor = v1_conn.cursor()

    # Initialize v2
    from memory_v2 import CCBMemoryV2
    v2_memory = CCBMemoryV2(db_path=str(v2_db_path), user_id=user_id)

    # Get v1 conversations
    v1_cursor.execute("""
        SELECT id, timestamp, provider, question, answer, metadata, tokens
        FROM conversations
        ORDER BY timestamp
    """)

    conversations = v1_cursor.fetchall()
    print(f"Found {len(conversations)} conversations in v1 database\n")

    # Migration strategy: Group conversations into sessions
    # Rule: New session if gap > 30 minutes or provider changes significantly

    current_session_id = None
    last_timestamp = None
    last_provider = None

    migrated_count = 0
    session_count = 0

    for row in conversations:
        conv_id, timestamp, provider, question, answer, metadata_str, tokens = row

        # Parse metadata
        try:
            metadata = json.loads(metadata_str) if metadata_str else {}
        except:
            metadata = {}

        # Parse timestamp
        try:
            ts = datetime.fromisoformat(timestamp)
        except:
            ts = datetime.now()

        # Decide if we need a new session
        create_new_session = False

        if current_session_id is None:
            create_new_session = True

        elif last_timestamp:
            # Calculate time gap
            time_gap = (ts - last_timestamp).total_seconds() / 60

            # New session if gap > 30 minutes
            if time_gap > 30:
                create_new_session = True

        # Create new session if needed
        if create_new_session:
            current_session_id = v2_memory.create_session(metadata={
                "title": f"Migrated Session {session_count + 1}",
                "migrated_from": "v1",
                "first_provider": provider
            })
            session_count += 1
            print(f"Created session {session_count}: {current_session_id}")

        # Record conversation in v2
        result = v2_memory.record_conversation(
            provider=provider,
            question=question,
            answer=answer,
            tokens=tokens,
            latency_ms=metadata.get("latency_ms"),
            model=metadata.get("model"),
            context_injected=metadata.get("memory_injected", False),
            context_count=metadata.get("memory_count", 0),
            metadata=metadata,
            session_id=current_session_id
        )

        migrated_count += 1

        # Update tracking
        last_timestamp = ts
        last_provider = provider

        # Progress
        if migrated_count % 10 == 0:
            print(f"  Migrated {migrated_count}/{len(conversations)}...")

    # Migrate skills_cache (if exists)
    try:
        v1_cursor.execute("SELECT COUNT(*) FROM skills_cache")
        skills_count = v1_cursor.fetchone()[0]

        if skills_count > 0:
            print(f"\nMigrating {skills_count} skills...")

            v2_conn = sqlite3.connect(v2_db_path)
            v2_cursor = v2_conn.cursor()

            v1_cursor.execute("SELECT * FROM skills_cache")
            for skill in v1_cursor.fetchall():
                v2_cursor.execute("""
                    INSERT OR REPLACE INTO skills_cache
                    (skill_name, description, triggers, source, installed, last_updated, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, skill)

            v2_conn.commit()
            v2_conn.close()
            print(f"  ✓ Migrated {skills_count} skills")

    except sqlite3.OperationalError:
        print("  No skills_cache table in v1 (skipping)")

    # Migrate skills_usage (if exists)
    try:
        v1_cursor.execute("SELECT COUNT(*) FROM skills_usage")
        usage_count = v1_cursor.fetchone()[0]

        if usage_count > 0:
            print(f"\nMigrating {usage_count} skills usage records...")

            v2_conn = sqlite3.connect(v2_db_path)
            v2_cursor = v2_conn.cursor()

            v1_cursor.execute("SELECT * FROM skills_usage")
            for usage in v1_cursor.fetchall():
                # Note: message_id will be NULL since we don't have mappings
                v2_cursor.execute("""
                    INSERT INTO skills_usage
                    (message_id, skill_name, task_keywords, provider, timestamp, success)
                    VALUES (NULL, ?, ?, ?, ?, ?)
                """, usage[1:])  # Skip id

            v2_conn.commit()
            v2_conn.close()
            print(f"  ✓ Migrated {usage_count} usage records")

    except sqlite3.OperationalError:
        print("  No skills_usage table in v1 (skipping)")

    v1_conn.close()

    # Print summary
    print("\n" + "=" * 60)
    print("Migration Summary")
    print("=" * 60)
    print(f"Conversations migrated: {migrated_count}")
    print(f"Sessions created: {session_count}")
    print(f"V1 database: {v1_db_path}")
    print(f"V2 database: {v2_db_path}")
    print("\nV1 database preserved as backup")
    print("\nTo use v2:")
    print("  1. Update gateway_server.py to import CCBMemoryV2")
    print("  2. Or: rename ccb_memory_v2.db -> ccb_memory.db")
    print("=" * 60)

    # Get v2 stats
    stats = v2_memory.get_stats()
    print("\nV2 Statistics:")
    print(f"  Total sessions: {stats['total_sessions']}")
    print(f"  Total messages: {stats['total_messages']}")
    print(f"  Total tokens: {stats['total_tokens']:,}")
    print()


def main():
    """CLI for migration"""
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "migrate":
        user_id = sys.argv[2] if len(sys.argv) > 2 else "leo"
        migrate_v1_to_v2(user_id=user_id)
    else:
        print("Usage: python3 migrate_v1_to_v2.py migrate [user_id]")
        print("\nThis will:")
        print("  1. Read ccb_memory.db (v1)")
        print("  2. Create ccb_memory_v2.db (v2)")
        print("  3. Convert and import all data")
        print("  4. Group conversations into sessions")
        print("  5. Keep v1 as backup")
        print("\nV1 database will NOT be modified.")


if __name__ == "__main__":
    main()
