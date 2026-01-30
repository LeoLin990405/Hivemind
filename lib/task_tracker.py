"""
Task Tracker System for CCB

Provides persistent task tracking with SQLite storage for multi-provider
task management. Tracks task status through lifecycle:
pending → running → completed/failed/cancelled
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from enum import Enum
from typing import Optional, List, Dict, Any
import sqlite3
import uuid
import time
from pathlib import Path
from contextlib import contextmanager


class TaskStatus(Enum):
    """Task lifecycle states."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class Task:
    """Represents a tracked task."""
    id: str
    provider: str
    message: str
    status: TaskStatus
    created_at: float
    updated_at: float
    result: Optional[str] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary."""
        d = asdict(self)
        d["status"] = self.status.value
        return d

    @classmethod
    def from_row(cls, row: sqlite3.Row) -> "Task":
        """Create Task from database row."""
        return cls(
            id=row["id"],
            provider=row["provider"],
            message=row["message"],
            status=TaskStatus(row["status"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            result=row["result"],
            error=row["error"],
            metadata=None,  # JSON decode if needed
        )


class TaskTracker:
    """
    SQLite-backed task tracker for CCB.

    Provides persistent storage and management of tasks across
    multiple AI providers.
    """

    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize the task tracker.

        Args:
            db_path: Path to SQLite database. Defaults to ~/.ccb_config/tasks.db
        """
        if db_path:
            self.db_path = Path(db_path)
        else:
            self.db_path = Path.home() / ".ccb_config" / "tasks.db"

        # Ensure directory exists
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    @contextmanager
    def _get_connection(self):
        """Get a database connection with row factory."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_db(self) -> None:
        """Initialize the SQLite database schema."""
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    provider TEXT NOT NULL,
                    message TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL,
                    result TEXT,
                    error TEXT,
                    metadata TEXT
                )
            """)
            # Create indexes for common queries
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_tasks_status
                ON tasks(status)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_tasks_created
                ON tasks(created_at)
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_tasks_provider
                ON tasks(provider)
            """)

    def create_task(self, provider: str, message: str,
                    metadata: Optional[Dict[str, Any]] = None) -> Task:
        """
        Create a new task.

        Args:
            provider: AI provider name (claude, gemini, codex, etc.)
            message: The message/query being sent
            metadata: Optional metadata dict

        Returns:
            The created Task object
        """
        import json

        task_id = str(uuid.uuid4())[:8]  # Short ID for readability
        now = time.time()

        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO tasks (id, provider, message, status, created_at, updated_at, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                task_id,
                provider,
                message,
                TaskStatus.PENDING.value,
                now,
                now,
                json.dumps(metadata) if metadata else None,
            ))

        return Task(
            id=task_id,
            provider=provider,
            message=message,
            status=TaskStatus.PENDING,
            created_at=now,
            updated_at=now,
            metadata=metadata,
        )

    def update_status(self, task_id: str, status: TaskStatus,
                      result: Optional[str] = None,
                      error: Optional[str] = None) -> bool:
        """
        Update task status.

        Args:
            task_id: Task ID to update
            status: New status
            result: Optional result text (for completed tasks)
            error: Optional error message (for failed tasks)

        Returns:
            True if task was updated, False if not found
        """
        now = time.time()

        with self._get_connection() as conn:
            cursor = conn.execute("""
                UPDATE tasks
                SET status = ?, updated_at = ?, result = ?, error = ?
                WHERE id = ?
            """, (status.value, now, result, error, task_id))

            return cursor.rowcount > 0

    def get_task(self, task_id: str) -> Optional[Task]:
        """
        Get a task by ID.

        Args:
            task_id: Task ID to retrieve

        Returns:
            Task object or None if not found
        """
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM tasks WHERE id = ?",
                (task_id,)
            )
            row = cursor.fetchone()

            if row:
                return Task.from_row(row)
            return None

    def list_tasks(self, status: Optional[TaskStatus] = None,
                   provider: Optional[str] = None,
                   limit: int = 20,
                   offset: int = 0) -> List[Task]:
        """
        List tasks with optional filtering.

        Args:
            status: Filter by status
            provider: Filter by provider
            limit: Maximum number of tasks to return
            offset: Number of tasks to skip

        Returns:
            List of Task objects
        """
        query = "SELECT * FROM tasks WHERE 1=1"
        params: List[Any] = []

        if status:
            query += " AND status = ?"
            params.append(status.value)

        if provider:
            query += " AND provider = ?"
            params.append(provider)

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        with self._get_connection() as conn:
            cursor = conn.execute(query, params)
            return [Task.from_row(row) for row in cursor.fetchall()]

    def cancel_task(self, task_id: str) -> bool:
        """
        Cancel a pending or running task.

        Args:
            task_id: Task ID to cancel

        Returns:
            True if task was cancelled, False if not found or already completed
        """
        now = time.time()

        with self._get_connection() as conn:
            cursor = conn.execute("""
                UPDATE tasks
                SET status = ?, updated_at = ?
                WHERE id = ? AND status IN (?, ?)
            """, (
                TaskStatus.CANCELLED.value,
                now,
                task_id,
                TaskStatus.PENDING.value,
                TaskStatus.RUNNING.value,
            ))

            return cursor.rowcount > 0

    def cleanup_old_tasks(self, max_age_hours: int = 24) -> int:
        """
        Remove tasks older than specified age.

        Args:
            max_age_hours: Maximum age in hours

        Returns:
            Number of tasks deleted
        """
        cutoff = time.time() - (max_age_hours * 3600)

        with self._get_connection() as conn:
            cursor = conn.execute(
                "DELETE FROM tasks WHERE created_at < ?",
                (cutoff,)
            )
            return cursor.rowcount

    def get_stats(self) -> Dict[str, int]:
        """
        Get task statistics.

        Returns:
            Dict with counts by status
        """
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT status, COUNT(*) as count
                FROM tasks
                GROUP BY status
            """)

            stats = {s.value: 0 for s in TaskStatus}
            for row in cursor.fetchall():
                stats[row["status"]] = row["count"]

            return stats
