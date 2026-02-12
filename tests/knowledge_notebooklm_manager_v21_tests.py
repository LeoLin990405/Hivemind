"""Tests for Knowledge Hub v2.1 NotebookLMManager."""
from __future__ import annotations

from pathlib import Path
import sys

repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(repo_root / "lib"))

from knowledge.notebooklm_manager import NotebookLMManager


class _FakeNotebookLMClient:
    def __init__(self):
        self.notebooks = {}
        self.sources = {}
        self.next_nb_id = 1
        self.next_source_id = 1
        self.removed_sources: list[tuple[str, str]] = []

    def create_notebook(self, title: str):
        notebook_id = f"nb-{self.next_nb_id}"
        self.next_nb_id += 1
        payload = {"id": notebook_id, "title": title}
        self.notebooks[notebook_id] = payload
        self.sources.setdefault(notebook_id, [])
        return payload

    def get_sources(self, notebook_id: str):
        return list(self.sources.get(notebook_id, []))

    def add_source(self, notebook_id: str, file_or_url: str):
        source_id = f"src-{self.next_source_id}"
        self.next_source_id += 1
        item = {
            "id": source_id,
            "title": Path(file_or_url).name,
            "created_time": f"2026-02-{self.next_source_id:02d}T00:00:00",
        }
        self.sources.setdefault(notebook_id, []).append(item)
        return item

    def remove_source(self, notebook_id: str, source_id: str):
        self.removed_sources.append((notebook_id, source_id))
        self.sources[notebook_id] = [item for item in self.sources.get(notebook_id, []) if item.get("id") != source_id]
        return {"success": True}

    def query(self, _notebook_id: str, question: str):
        return {"answer": f"generated::{question[:24]}"}


def test_create_notebook_with_obsidian_sync(tmp_path) -> None:
    manager = NotebookLMManager(
        vault_path=str(tmp_path / "Knowledge-Hub"),
        nlm_client=_FakeNotebookLMClient(),
    )

    meta = manager.create_notebook_with_obsidian_sync("Transformer Architecture", category="AI_Research")

    assert meta["notebook_id"]
    assert meta["title"] == "Transformer Architecture"
    assert (tmp_path / "Knowledge-Hub" / "03_NotebookLM" / "_Notebooks_Registry.md").exists()
    assert (tmp_path / "Knowledge-Hub" / "_System" / "NotebookLM_Status.md").exists()


def test_add_pdf_with_tracking_rotates_when_limit_reached(tmp_path) -> None:
    client = _FakeNotebookLMClient()
    manager = NotebookLMManager(
        vault_path=str(tmp_path / "Knowledge-Hub"),
        nlm_client=client,
        max_sources_per_notebook=1,
    )

    meta = manager.create_notebook_with_obsidian_sync("Rotation Test")
    notebook_id = meta["notebook_id"]

    pdf1 = tmp_path / "a.pdf"
    pdf2 = tmp_path / "b.pdf"
    pdf1.write_bytes(b"a")
    pdf2.write_bytes(b"b")

    manager.add_pdf_with_tracking(notebook_id, str(pdf1), auto_rotate=True)
    manager.add_pdf_with_tracking(notebook_id, str(pdf2), auto_rotate=True)

    assert len(client.get_sources(notebook_id)) == 1
    assert client.removed_sources, "rotation should remove the least-used source"

    tracker = (tmp_path / "Knowledge-Hub" / "03_NotebookLM" / "_Source_Tracker" / "Source_Tracker.md").read_text(encoding="utf-8")
    assert "action=added" in tracker
    assert "action=rotated" in tracker


def test_generate_all_artifacts_syncs_to_obsidian(tmp_path) -> None:
    manager = NotebookLMManager(
        vault_path=str(tmp_path / "Knowledge-Hub"),
        nlm_client=_FakeNotebookLMClient(),
    )
    meta = manager.create_notebook_with_obsidian_sync("Artifacts Test")

    artifacts = manager.generate_all_artifacts(meta["notebook_id"], sync_to_obsidian=True)

    assert "study_guide" in artifacts

    notebook_dir = tmp_path / "Knowledge-Hub" / "03_NotebookLM" / "Active_Notebooks" / meta["folder"]
    assert (notebook_dir / "Study_Guide.md").exists()
    assert (notebook_dir / "FAQ.md").exists()
    assert (notebook_dir / "Timeline.md").exists()
    assert (notebook_dir / "Briefing_Doc.md").exists()
