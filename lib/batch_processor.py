"""
Batch Processing System for CCB

Supports batch submission and parallel execution of multiple tasks.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Callable, Any
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, as_completed
import subprocess
import time
import uuid
import json
from pathlib import Path


class BatchStatus(Enum):
    """Status of a batch job."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


@dataclass
class BatchTask:
    """A single task within a batch."""
    id: str
    message: str
    provider: Optional[str] = None
    status: BatchStatus = BatchStatus.PENDING
    result: Optional[str] = None
    error: Optional[str] = None
    latency_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "message": self.message[:100] + "..." if len(self.message) > 100 else self.message,
            "provider": self.provider,
            "status": self.status.value,
            "latency_ms": self.latency_ms,
            "error": self.error,
        }


@dataclass
class BatchJob:
    """A batch job containing multiple tasks."""
    id: str
    tasks: List[BatchTask]
    created_at: float
    completed_at: Optional[float] = None
    status: BatchStatus = BatchStatus.PENDING
    default_provider: Optional[str] = None

    @property
    def progress(self) -> float:
        """Calculate progress as percentage."""
        if not self.tasks:
            return 0.0
        completed = sum(1 for t in self.tasks if t.status in [BatchStatus.COMPLETED, BatchStatus.FAILED])
        return completed / len(self.tasks)

    @property
    def successful_count(self) -> int:
        return sum(1 for t in self.tasks if t.status == BatchStatus.COMPLETED)

    @property
    def failed_count(self) -> int:
        return sum(1 for t in self.tasks if t.status == BatchStatus.FAILED)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "status": self.status.value,
            "task_count": len(self.tasks),
            "progress": f"{self.progress * 100:.1f}%",
            "successful": self.successful_count,
            "failed": self.failed_count,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
        }


class BatchProcessor:
    """
    Processes batch jobs with parallel execution.

    Supports progress tracking and cancellation.
    """

    # Provider to ask command mapping
    PROVIDER_COMMANDS = {
        "claude": "lask",
        "codex": "cask",
        "gemini": "gask",
        "opencode": "oask",
        "droid": "dask",
        "iflow": "iask",
        "kimi": "kask",
        "qwen": "qask",
        "deepseek": "dskask",
    }

    def __init__(
        self,
        max_concurrent: int = 5,
        default_provider: Optional[str] = None,
        timeout_s: float = 60.0,
    ):
        """
        Initialize the batch processor.

        Args:
            max_concurrent: Maximum concurrent task executions
            default_provider: Default provider for tasks without explicit provider
            timeout_s: Timeout per task in seconds
        """
        self.max_concurrent = max_concurrent
        self.default_provider = default_provider
        self.timeout_s = timeout_s
        self._jobs: Dict[str, BatchJob] = {}
        self._cancelled: set = set()

    def _get_ask_command(self, provider: str) -> str:
        """Get the ask command for a provider."""
        return self.PROVIDER_COMMANDS.get(provider, "lask")

    def create_batch(
        self,
        messages: List[str],
        provider: Optional[str] = None,
    ) -> BatchJob:
        """
        Create a new batch job.

        Args:
            messages: List of messages to process
            provider: Optional provider override for all tasks

        Returns:
            BatchJob object
        """
        job_id = str(uuid.uuid4())[:8]
        tasks = []

        for i, msg in enumerate(messages):
            task = BatchTask(
                id=f"{job_id}-{i}",
                message=msg.strip(),
                provider=provider or self.default_provider,
            )
            tasks.append(task)

        job = BatchJob(
            id=job_id,
            tasks=tasks,
            created_at=time.time(),
            default_provider=provider or self.default_provider,
        )

        self._jobs[job_id] = job
        return job

    def _execute_task(self, task: BatchTask) -> BatchTask:
        """Execute a single task."""
        if task.id in self._cancelled:
            task.status = BatchStatus.CANCELLED
            return task

        provider = task.provider or self.default_provider or "claude"
        ask_cmd = self._get_ask_command(provider)
        start_time = time.time()

        try:
            cmd = f"{ask_cmd} <<'EOF'\n{task.message}\nEOF"
            result = subprocess.run(
                ["bash", "-c", cmd],
                capture_output=True,
                text=True,
                timeout=self.timeout_s,
            )

            task.latency_ms = (time.time() - start_time) * 1000
            task.provider = provider

            if result.returncode == 0:
                task.status = BatchStatus.COMPLETED
                task.result = result.stdout
            else:
                task.status = BatchStatus.FAILED
                task.error = result.stderr or f"Exit code: {result.returncode}"

        except subprocess.TimeoutExpired:
            task.latency_ms = (time.time() - start_time) * 1000
            task.status = BatchStatus.FAILED
            task.error = "Timeout"
        except Exception as e:
            task.latency_ms = (time.time() - start_time) * 1000
            task.status = BatchStatus.FAILED
            task.error = str(e)

        return task

    def execute_batch(
        self,
        job: BatchJob,
        on_progress: Optional[Callable[[BatchJob, BatchTask], None]] = None,
    ) -> BatchJob:
        """
        Execute a batch job.

        Args:
            job: The batch job to execute
            on_progress: Optional callback called after each task completes

        Returns:
            Updated BatchJob
        """
        job.status = BatchStatus.RUNNING

        with ThreadPoolExecutor(max_workers=self.max_concurrent) as executor:
            # Submit all tasks
            future_to_task = {
                executor.submit(self._execute_task, task): task
                for task in job.tasks
            }

            # Collect results
            for future in as_completed(future_to_task):
                task = future_to_task[future]
                try:
                    completed_task = future.result()
                    # Update task in job
                    for i, t in enumerate(job.tasks):
                        if t.id == completed_task.id:
                            job.tasks[i] = completed_task
                            break

                    if on_progress:
                        on_progress(job, completed_task)

                except Exception as e:
                    task.status = BatchStatus.FAILED
                    task.error = str(e)

                # Check for cancellation
                if job.id in self._cancelled:
                    for f in future_to_task:
                        f.cancel()
                    job.status = BatchStatus.CANCELLED
                    break

        job.completed_at = time.time()

        if job.status != BatchStatus.CANCELLED:
            if job.failed_count == len(job.tasks):
                job.status = BatchStatus.FAILED
            else:
                job.status = BatchStatus.COMPLETED

        return job

    def get_job(self, job_id: str) -> Optional[BatchJob]:
        """Get a batch job by ID."""
        return self._jobs.get(job_id)

    def get_progress(self, job_id: str) -> float:
        """Get progress of a batch job."""
        job = self._jobs.get(job_id)
        return job.progress if job else 0.0

    def cancel_batch(self, job_id: str) -> bool:
        """
        Cancel a batch job.

        Args:
            job_id: Job ID to cancel

        Returns:
            True if job was found and marked for cancellation
        """
        if job_id in self._jobs:
            self._cancelled.add(job_id)
            job = self._jobs[job_id]
            # Mark pending tasks as cancelled
            for task in job.tasks:
                if task.status == BatchStatus.PENDING:
                    task.status = BatchStatus.CANCELLED
                    self._cancelled.add(task.id)
            return True
        return False

    def list_jobs(self, limit: int = 20) -> List[BatchJob]:
        """List recent batch jobs."""
        jobs = sorted(
            self._jobs.values(),
            key=lambda j: j.created_at,
            reverse=True,
        )
        return jobs[:limit]


def format_batch_status(job: BatchJob, verbose: bool = False) -> str:
    """Format batch job status for display."""
    lines = []
    lines.append("=" * 60)
    lines.append(f"Batch Job: {job.id}")
    lines.append("=" * 60)
    lines.append(f"Status:      {job.status.value}")
    lines.append(f"Progress:    {job.progress * 100:.1f}%")
    lines.append(f"Tasks:       {len(job.tasks)}")
    lines.append(f"Successful:  {job.successful_count}")
    lines.append(f"Failed:      {job.failed_count}")

    if job.completed_at:
        duration = job.completed_at - job.created_at
        lines.append(f"Duration:    {duration:.1f}s")

    if verbose:
        lines.append("-" * 60)
        lines.append(f"{'Task ID':<15} {'Status':<12} {'Latency':<10} {'Provider':<10}")
        lines.append("-" * 60)
        for task in job.tasks:
            latency = f"{task.latency_ms:.0f}ms" if task.latency_ms else "-"
            provider = task.provider or "-"
            lines.append(f"{task.id:<15} {task.status.value:<12} {latency:<10} {provider:<10}")
            if task.error:
                lines.append(f"  Error: {task.error}")

    lines.append("=" * 60)
    return "\n".join(lines)
