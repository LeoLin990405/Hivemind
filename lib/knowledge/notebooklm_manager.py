"""NotebookLM Manager for Knowledge Hub v2.1 workflows."""
from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from lib.common.logging import get_logger

from .notebooklm_client import NotebookLMClient
from .source_manager import NotebookLMSourceManager, SourceRecord


logger = get_logger("knowledge.notebooklm_manager")


DEFAULT_DASHBOARD_TEMPLATE = """---
type: dashboard
title: NotebookLM Usage Monitor
auto_update: true
tags: [dashboard, notebooklm, monitoring]
---

# NotebookLM Usage Monitor

> Last Updated: <% tp.date.now("YYYY-MM-DD HH:mm") %>

## 📊 Account Status

**Plan**: Free / Plus / Ultra / Enterprise
**Notebooks**: `= this.notebooks_used` / `= this.notebooks_limit`
**Daily Usage**:
- Chat Queries: `= this.chat_queries_today`
- Audio Generations: `= this.audio_generated_today`
- Deep Research: `= this.deep_research_this_month`

## 📚 Active Notebooks

```dataview
TABLE
  notebook_id as "ID",
  source_count as "Sources",
  max_sources as "Max",
  status as "Status",
  created as "Created"
FROM "03_NotebookLM/Active_Notebooks"
WHERE type = "notebooklm-meta"
SORT created DESC
```

## ⚠️ Source Limits Warning

```dataviewjs
const notebooks = dv.pages('"03_NotebookLM/Active_Notebooks"')
  .where(p => p.type === "notebooklm-meta");

const nearLimit = notebooks.filter(nb => {
  const usage = nb.source_count / nb.max_sources;
  return usage >= 0.8;
});

if (nearLimit.length > 0) {
  dv.header(3, "🚨 Notebooks Near Source Limit");
  dv.table(
    ["Notebook", "Usage", "Action"],
    nearLimit.map(nb => [
      nb.file.link,
      `${nb.source_count}/${nb.max_sources} (${(nb.source_count/nb.max_sources*100).toFixed(0)}%)`,
      "Consider rotating sources"
    ])
  );
} else {
  dv.paragraph("✅ All notebooks within limits");
}
```
"""


class NotebookLMManager:
    """NotebookLM smart manager with Obsidian sync and source rotation."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        vault_path: str = "~/Knowledge-Hub",
        max_sources_per_notebook: int = 50,
        nlm_client: Optional[Any] = None,
    ):
        del api_key  # reserved for future Enterprise API support

        self.vault_path = Path(vault_path).expanduser()
        self.max_sources = max(1, int(max_sources_per_notebook))

        self.notebook_root = self.vault_path / "03_NotebookLM"
        self.active_root = self.notebook_root / "Active_Notebooks"
        self.archive_root = self.notebook_root / "Archived_Notebooks"
        self.deep_research_root = self.notebook_root / "Deep_Research_Reports"
        self.source_tracker_dir = self.notebook_root / "_Source_Tracker"

        self.registry_path = self.notebook_root / "_Notebooks_Registry.md"
        self.source_tracker_path = self.source_tracker_dir / "Source_Tracker.md"
        self.dashboard_path = self.vault_path / "_System" / "NotebookLM_Status.md"

        self._ensure_vault_structure()

        self.nlm = nlm_client or NotebookLMClient()
        self.source_manager = NotebookLMSourceManager(max_sources=self.max_sources)
        self.registry = self._load_registry()

    # ---------- public API ----------

    def create_notebook_with_obsidian_sync(
        self,
        title: str,
        category: str = "Research",
    ) -> Dict[str, Any]:
        """Create a notebook and initialize its Obsidian workspace."""

        existing = self._find_notebook_meta_by_title(title)
        if existing:
            return existing

        created = self.nlm.create_notebook(title)
        notebook_id = self._extract_id(created)
        if not notebook_id:
            raise RuntimeError("Failed to create notebook: missing notebook id")

        folder_name = self._safe_folder_name(title)
        notebook_path = self.active_root / folder_name
        notebook_path.mkdir(parents=True, exist_ok=True)

        meta = {
            "type": "notebooklm-meta",
            "notebook_id": notebook_id,
            "title": title,
            "category": category,
            "created": datetime.now().isoformat(timespec="seconds"),
            "source_count": 0,
            "max_sources": self.max_sources,
            "status": "active",
            "folder": folder_name,
        }

        self._write_notebook_meta_file(meta)
        self._update_registry(notebook_id, meta)
        self._append_sync_log(notebook_id, f"created notebook '{title}'")

        return meta

    def get_notebook_meta(self, notebook_id: str) -> Dict[str, Any]:
        """Get notebook metadata from local registry."""

        notebooks = self.registry.get("notebooks", {})
        if notebook_id not in notebooks:
            raise KeyError(f"Notebook not found in registry: {notebook_id}")
        return notebooks[notebook_id]

    def find_or_create_notebook(self, title: str, category: str = "Research") -> Dict[str, Any]:
        """Find an existing notebook by title, or create one."""

        existing = self._find_notebook_meta_by_title(title)
        if existing:
            return existing
        return self.create_notebook_with_obsidian_sync(title=title, category=category)

    def add_pdf_with_tracking(
        self,
        notebook_id: str,
        pdf_path: str,
        auto_rotate: bool = True,
    ) -> str:
        """Add PDF to notebook and rotate sources automatically when needed."""

        path = str(Path(pdf_path).expanduser())

        if auto_rotate:
            result = self.source_manager.add_source_with_rotation(
                notebook_id=notebook_id,
                new_source=path,
                get_sources=self._get_sources,
                add_source=self._add_source,
                remove_source=self._remove_source,
                backup_to_obsidian=self._backup_source_to_obsidian,
            )
        else:
            result = self._add_source(notebook_id, path)

        source_id = self._extract_id(result)
        self._track_source_in_obsidian(
            notebook_id=notebook_id,
            source=result,
            file_path=path,
            action="added",
            reason="manual-add",
        )

        self._refresh_source_count(notebook_id)
        self._append_sync_log(notebook_id, f"added source {Path(path).name}")
        return source_id

    def add_text_source_with_tracking(
        self,
        notebook_id: str,
        title: str,
        text_content: str,
        auto_rotate: bool = True,
    ) -> str:
        """Add text content as a source with tracking and optional rotation."""

        temp_dir = self.vault_path / ".tmp" / "notebooklm_sources"
        temp_dir.mkdir(parents=True, exist_ok=True)

        temp_file = temp_dir / f"{self._safe_folder_name(title)}.md"
        temp_file.write_text(text_content, encoding="utf-8")

        try:
            return self.add_pdf_with_tracking(notebook_id, str(temp_file), auto_rotate=auto_rotate)
        finally:
            try:
                temp_file.unlink(missing_ok=True)
            except OSError:
                logger.debug("Failed to cleanup temp source file: %s", temp_file)

    def generate_all_artifacts(
        self,
        notebook_id: str,
        sync_to_obsidian: bool = True,
    ) -> Dict[str, str]:
        """Generate NotebookLM artifacts and optionally sync to Obsidian."""

        artifacts = {
            "study_guide": self._generate_artifact(notebook_id, "study_guide"),
            "faq": self._generate_artifact(notebook_id, "faq"),
            "timeline": self._generate_artifact(notebook_id, "timeline"),
            "briefing": self._generate_artifact(notebook_id, "briefing"),
            "audio": self._generate_artifact(notebook_id, "audio"),
        }

        if sync_to_obsidian:
            self._sync_artifacts_to_obsidian(notebook_id, artifacts)

        self._append_sync_log(notebook_id, "generated notebook artifacts")
        return artifacts

    def run_deep_research(
        self,
        notebook_id: str,
        topic: str,
        mode: str = "deep",
    ) -> str:
        """Run deep/fast research and save report into Obsidian."""

        mode = (mode or "deep").strip().lower()
        mode = "fast" if mode == "fast" else "deep"

        prompt = (
            f"Run a {mode} research synthesis for topic: {topic}. "
            "Output: executive summary, current state, gaps, recommendations, references."
        )

        result = self._query_notebook(notebook_id, prompt)
        self._save_deep_research_report(notebook_id, topic, result, mode=mode)
        self._append_sync_log(notebook_id, f"ran {mode} research on '{topic}'")
        return result

    def ensure_status_dashboard(self, overwrite: bool = False) -> Path:
        """Create or refresh the NotebookLM status dashboard template."""

        if self.dashboard_path.exists() and not overwrite:
            return self.dashboard_path

        self.dashboard_path.parent.mkdir(parents=True, exist_ok=True)
        self.dashboard_path.write_text(DEFAULT_DASHBOARD_TEMPLATE, encoding="utf-8")
        return self.dashboard_path

    # ---------- generation/sync internals ----------

    def _generate_artifact(self, notebook_id: str, artifact_type: str) -> str:
        prompt_map = {
            "study_guide": "Generate a structured study guide with concepts, key points and review questions.",
            "faq": "Generate a FAQ list with concise answers based on the notebook sources.",
            "timeline": "Generate a chronological timeline with important milestones and dates.",
            "briefing": "Generate a concise executive briefing document for stakeholders.",
            "audio": "Generate an audio-overview style script suitable for a podcast episode.",
        }

        query_text = prompt_map.get(artifact_type, f"Generate {artifact_type} for this notebook.")

        try:
            return self._query_notebook(notebook_id, query_text)
        except (RuntimeError, ValueError, TypeError, OSError) as exc:
            logger.warning("Failed to generate %s for notebook %s: %s", artifact_type, notebook_id, exc)
            return ""

    def _sync_artifacts_to_obsidian(
        self,
        notebook_id: str,
        artifacts: Dict[str, str],
    ) -> None:
        meta = self.get_notebook_meta(notebook_id)
        notebook_path = self.active_root / meta["folder"]
        notebook_path.mkdir(parents=True, exist_ok=True)

        generated = datetime.now().isoformat(timespec="seconds")

        if artifacts.get("study_guide"):
            self._write_markdown_note(
                notebook_path / "Study_Guide.md",
                {
                    "type": "notebooklm-study-guide",
                    "notebook_id": notebook_id,
                    "generated": generated,
                    "tags": ["notebooklm", "study-guide", "ai-generated"],
                },
                f"# Study Guide\n\n{artifacts['study_guide']}\n",
            )

        if artifacts.get("faq"):
            self._write_markdown_note(
                notebook_path / "FAQ.md",
                {
                    "type": "notebooklm-faq",
                    "notebook_id": notebook_id,
                    "generated": generated,
                    "tags": ["notebooklm", "faq", "ai-generated"],
                },
                f"# Frequently Asked Questions\n\n{artifacts['faq']}\n",
            )

        if artifacts.get("timeline"):
            self._write_markdown_note(
                notebook_path / "Timeline.md",
                {
                    "type": "notebooklm-timeline",
                    "notebook_id": notebook_id,
                    "generated": generated,
                    "tags": ["notebooklm", "timeline", "ai-generated"],
                },
                f"# Timeline\n\n{artifacts['timeline']}\n",
            )

        if artifacts.get("briefing"):
            self._write_markdown_note(
                notebook_path / "Briefing_Doc.md",
                {
                    "type": "notebooklm-briefing",
                    "notebook_id": notebook_id,
                    "generated": generated,
                    "tags": ["notebooklm", "briefing", "ai-generated"],
                },
                f"# Briefing Doc\n\n{artifacts['briefing']}\n",
            )

        if artifacts.get("audio"):
            audio_dir = notebook_path / "Audio_Overviews"
            audio_dir.mkdir(parents=True, exist_ok=True)

            stamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
            transcript_path = audio_dir / f"{stamp}_Transcript.md"
            self._write_markdown_note(
                transcript_path,
                {
                    "type": "notebooklm-audio-transcript",
                    "notebook_id": notebook_id,
                    "generated": generated,
                    "tags": ["notebooklm", "audio", "transcript"],
                },
                (
                    "# Audio Overview Transcript\n\n"
                    "## Transcript\n"
                    f"{artifacts['audio']}\n\n"
                    "## Key Takeaways\n"
                    "<!-- Manual notes -->\n"
                ),
            )

    def _save_deep_research_report(
        self,
        notebook_id: str,
        topic: str,
        content: str,
        *,
        mode: str,
    ) -> Path:
        date = datetime.now().strftime("%Y-%m-%d")
        filename = f"{date}_{self._safe_folder_name(topic)}_{mode}_Research.md"
        path = self.deep_research_root / filename
        path.parent.mkdir(parents=True, exist_ok=True)

        self._write_markdown_note(
            path,
            {
                "type": "deep-research-report",
                "topic": topic,
                "date": date,
                "mode": mode,
                "source": "NotebookLM",
                "notebook_id": notebook_id,
                "tags": ["deep-research", "literature-review", "ai-generated"],
            },
            (
                f"# Literature Review: {topic}\n\n"
                f"**Generated**: {date}\n"
                f"**Mode**: {mode}\n\n"
                "## Executive Summary\n\n"
                "## Current State of Research\n\n"
                "## Research Gaps Identified\n\n"
                "## Recommendations\n\n"
                "## Full Report\n\n"
                f"{content}\n"
            ),
        )

        return path

    # ---------- notebook/source internals ----------

    def _query_notebook(self, notebook_id: str, prompt: str) -> str:
        response = self.nlm.query(notebook_id, prompt)
        if isinstance(response, dict):
            return str(response.get("answer") or "")
        return str(response or "")

    def _get_sources(self, notebook_id: str) -> List[Dict[str, Any]]:
        try:
            sources = self.nlm.get_sources(notebook_id)
        except (RuntimeError, ValueError, TypeError, OSError):
            return []
        return sources if isinstance(sources, list) else []

    def _add_source(self, notebook_id: str, source: Any) -> Dict[str, Any]:
        response = self.nlm.add_source(notebook_id, str(source))
        if isinstance(response, dict):
            return response
        return {"id": self._extract_id(response), "title": str(source)}

    def _remove_source(self, notebook_id: str, source_id: str) -> None:
        remover = getattr(self.nlm, "remove_source", None)
        if callable(remover):
            try:
                remover(notebook_id, source_id)
                return
            except (RuntimeError, ValueError, TypeError, OSError) as exc:
                logger.warning("Failed to remove source %s from notebook %s: %s", source_id, notebook_id, exc)
                return
        logger.info("NotebookLM client does not support remove_source; skipped removal for %s", source_id)

    def _backup_source_to_obsidian(self, notebook_id: str, source: SourceRecord) -> None:
        notebook_meta = self.get_notebook_meta(notebook_id)
        backup_dir = self.active_root / notebook_meta["folder"] / "Source_Backups"
        backup_dir.mkdir(parents=True, exist_ok=True)

        backup_path = backup_dir / f"{self._safe_folder_name(source.title)}_{source.source_id or 'source'}.md"
        self._write_markdown_note(
            backup_path,
            {
                "type": "notebooklm-source-backup",
                "notebook_id": notebook_id,
                "source_id": source.source_id,
                "source_title": source.title,
                "rotated_date": datetime.now().isoformat(timespec="seconds"),
                "tags": ["notebooklm", "source", "backup"],
            },
            "# Source Backup\n\n"
            f"- Title: {source.title}\n"
            f"- Source ID: {source.source_id}\n"
            "\n```json\n"
            f"{yaml.safe_dump(source.raw, allow_unicode=True, sort_keys=False)}"
            "```\n",
        )

        self._track_source_in_obsidian(
            notebook_id=notebook_id,
            source=source.raw,
            file_path=str(backup_path),
            action="rotated",
            reason="max-sources-limit",
        )

    def _track_source_in_obsidian(
        self,
        notebook_id: str,
        source: Dict[str, Any],
        file_path: str,
        action: str,
        reason: str,
    ) -> None:
        self.source_tracker_path.parent.mkdir(parents=True, exist_ok=True)

        source_title = source.get("title") or source.get("name") or Path(file_path).name
        source_id = self._extract_id(source)
        ts = datetime.now().isoformat(timespec="seconds")

        line = (
            f"- {ts} | action={action} | notebook={notebook_id} | "
            f"source_id={source_id or 'n/a'} | source_title={source_title} | "
            f"path={file_path} | reason={reason}\n"
        )

        if not self.source_tracker_path.exists():
            self.source_tracker_path.write_text(
                "# NotebookLM Source Tracker\n\n"
                "This file records source add/rotate events.\n\n"
                "## History\n\n",
                encoding="utf-8",
            )

        with self.source_tracker_path.open("a", encoding="utf-8") as handle:
            handle.write(line)

    # ---------- registry/meta internals ----------

    def _ensure_vault_structure(self) -> None:
        for path in [
            self.active_root,
            self.archive_root,
            self.deep_research_root,
            self.source_tracker_dir,
            self.vault_path / "_System",
        ]:
            path.mkdir(parents=True, exist_ok=True)

        if not self.registry_path.exists():
            self._write_registry({"notebooks": {}})

        if not self.source_tracker_path.exists():
            self.source_tracker_path.write_text(
                "# NotebookLM Source Tracker\n\n"
                "This file records source add/rotate events.\n\n"
                "## History\n\n",
                encoding="utf-8",
            )

        self.ensure_status_dashboard(overwrite=False)

    def _load_registry(self) -> Dict[str, Any]:
        if not self.registry_path.exists():
            return {"notebooks": {}}

        text = self.registry_path.read_text(encoding="utf-8")
        frontmatter = self._extract_frontmatter(text)
        if not frontmatter:
            return {"notebooks": {}}

        notebooks = frontmatter.get("notebooks", {})
        if not isinstance(notebooks, dict):
            notebooks = {}

        return {
            "notebooks": notebooks,
            "updated": frontmatter.get("updated"),
        }

    def _update_registry(self, notebook_id: str, meta: Dict[str, Any]) -> None:
        notebooks = dict(self.registry.get("notebooks", {}))
        notebooks[notebook_id] = meta
        self.registry = {
            "notebooks": notebooks,
            "updated": datetime.now().isoformat(timespec="seconds"),
        }
        self._write_registry(self.registry)

    def _write_registry(self, payload: Dict[str, Any]) -> None:
        frontmatter = {
            "type": "notebooklm-registry",
            "updated": payload.get("updated") or datetime.now().isoformat(timespec="seconds"),
            "notebooks": payload.get("notebooks", {}),
        }

        lines = [
            "# NotebookLM Notebooks Registry",
            "",
            "## Active Notebooks",
            "",
            "| Notebook ID | Title | Sources | Status | Updated |",
            "|---|---|---:|---|---|",
        ]

        notebooks = frontmatter["notebooks"]
        for notebook_id, meta in sorted(notebooks.items(), key=lambda row: row[1].get("title", "")):
            lines.append(
                "| "
                f"{notebook_id} | {meta.get('title', '')} | {meta.get('source_count', 0)}/{meta.get('max_sources', self.max_sources)} | "
                f"{meta.get('status', 'active')} | {meta.get('created', '')} |"
            )

        content = self._render_frontmatter(frontmatter) + "\n" + "\n".join(lines) + "\n"
        self.registry_path.write_text(content, encoding="utf-8")

    def _write_notebook_meta_file(self, meta: Dict[str, Any]) -> Path:
        notebook_path = self.active_root / meta["folder"]
        notebook_path.mkdir(parents=True, exist_ok=True)

        meta_file = notebook_path / "_notebook_meta.md"
        body = (
            f"# {meta['title']} - NotebookLM Metadata\n\n"
            "## NotebookLM Link\n"
            f"[Open in NotebookLM](https://notebooklm.google.com/notebook/{meta['notebook_id']})\n\n"
            "## Source Count\n"
            f"Current: {meta['source_count']} / {meta['max_sources']}\n\n"
            "## Actions\n"
            "- [ ] Add sources\n"
            "- [ ] Generate Study Guide\n"
            "- [ ] Generate FAQ\n"
            "- [ ] Generate Audio Overview\n"
            "- [ ] Run Deep Research\n\n"
            "## Sync Log\n"
            "<!-- Auto-updated by NotebookLM Manager -->\n"
        )

        self._write_markdown_note(meta_file, meta, body)
        return meta_file

    def _append_sync_log(self, notebook_id: str, message: str) -> None:
        try:
            meta = self.get_notebook_meta(notebook_id)
        except KeyError:
            return

        meta_file = self.active_root / meta["folder"] / "_notebook_meta.md"
        if not meta_file.exists():
            return

        line = f"- {datetime.now().isoformat(timespec='seconds')} - {message}\n"
        with meta_file.open("a", encoding="utf-8") as handle:
            handle.write(line)

    def _refresh_source_count(self, notebook_id: str) -> None:
        try:
            meta = self.get_notebook_meta(notebook_id)
        except KeyError:
            return

        sources = self._get_sources(notebook_id)
        meta["source_count"] = len(sources)
        self._update_registry(notebook_id, meta)
        self._write_notebook_meta_file(meta)

    def _find_notebook_meta_by_title(self, title: str) -> Optional[Dict[str, Any]]:
        normalized = title.strip().lower()
        for meta in self.registry.get("notebooks", {}).values():
            if str(meta.get("title", "")).strip().lower() == normalized:
                return meta
        return None

    # ---------- markdown helpers ----------

    def _render_frontmatter(self, data: Dict[str, Any]) -> str:
        yaml_content = yaml.safe_dump(data, allow_unicode=True, sort_keys=False).strip()
        return f"---\n{yaml_content}\n---"

    def _extract_frontmatter(self, text: str) -> Dict[str, Any]:
        if not text.startswith("---\n"):
            return {}

        end_marker = "\n---\n"
        end = text.find(end_marker, 4)
        if end == -1:
            return {}

        raw = text[4:end]
        try:
            parsed = yaml.safe_load(raw) or {}
        except yaml.YAMLError:
            return {}

        return parsed if isinstance(parsed, dict) else {}

    def _write_markdown_note(self, path: Path, frontmatter: Dict[str, Any], body: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = self._render_frontmatter(frontmatter)
        path.write_text(f"{payload}\n\n{body.strip()}\n", encoding="utf-8")

    def _extract_id(self, payload: Any) -> str:
        if payload is None:
            return ""
        if isinstance(payload, str):
            return payload
        if isinstance(payload, dict):
            return str(payload.get("id") or payload.get("notebook_id") or payload.get("source_id") or "")

        for attr in ["id", "notebook_id", "source_id"]:
            if hasattr(payload, attr):
                value = getattr(payload, attr)
                if value:
                    return str(value)

        return ""

    def _safe_folder_name(self, value: str) -> str:
        cleaned = re.sub(r"[^\w\-\s\u4e00-\u9fff]", "_", value.strip())
        cleaned = re.sub(r"\s+", "_", cleaned)
        cleaned = re.sub(r"_+", "_", cleaned)
        return cleaned.strip("_") or "Notebook"
