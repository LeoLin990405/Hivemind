"""Tests for v2.1 audio/deep research workflows."""
from __future__ import annotations

from pathlib import Path
import sys

repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(repo_root / "lib"))

from knowledge.audio_overview_workflow import AudioOverviewWorkflow
from knowledge.deep_research_workflow import DeepResearchWorkflow
from knowledge.notebooklm_manager import NotebookLMManager


class _FakeNotebookLMClient:
    def __init__(self):
        self.notebooks = {}
        self.sources = {}
        self.next_nb_id = 1

    def create_notebook(self, title: str):
        notebook_id = f"nb-{self.next_nb_id}"
        self.next_nb_id += 1
        self.notebooks[notebook_id] = {"id": notebook_id, "title": title}
        self.sources.setdefault(notebook_id, [])
        return self.notebooks[notebook_id]

    def get_sources(self, notebook_id: str):
        return list(self.sources.get(notebook_id, []))

    def add_source(self, notebook_id: str, file_or_url: str):
        item = {"id": f"s-{len(self.sources[notebook_id]) + 1}", "title": Path(file_or_url).name}
        self.sources[notebook_id].append(item)
        return item

    def remove_source(self, notebook_id: str, source_id: str):
        self.sources[notebook_id] = [x for x in self.sources[notebook_id] if x["id"] != source_id]
        return {"success": True}

    def query(self, _notebook_id: str, question: str):
        if "identify research gaps" in question.lower():
            return {"answer": "- gap one\n- gap two"}
        return {"answer": f"auto::{question[:40]}"}


class _FakeObsidianCLI:
    def __init__(self, **kwargs):
        pass
    def create_note(self, **kwargs):
        return False
    def open_note(self, **kwargs):
        return False
    def search(self, **kwargs):
        return False
    def daily_note(self, **kwargs):
        return False
    def move_note(self, **kwargs):
        return False
    def delete_note(self, **kwargs):
        return False


def test_audio_overview_workflow_generates_transcript_note(tmp_path) -> None:
    vault = tmp_path / "Knowledge-Hub"
    notes_dir = vault / "04_Research_Notes" / "AI"
    notes_dir.mkdir(parents=True)
    (notes_dir / "note1.md").write_text("# Note 1\ncontent", encoding="utf-8")

    manager = NotebookLMManager(
        vault_path=str(vault),
        nlm_client=_FakeNotebookLMClient(),
        cli=_FakeObsidianCLI(),
    )
    workflow = AudioOverviewWorkflow(vault_path=str(vault), manager=manager)

    output = workflow.generate_podcast_from_notes(
        notes_pattern="04_Research_Notes/AI/**/*.md",
        notebook_title="AI_Research_Podcast",
    )

    assert output.exists()

    meta = manager.find_or_create_notebook("AI_Research_Podcast", category="Audio_Generation")
    audio_dir = vault / "03_NotebookLM" / "Active_Notebooks" / meta["folder"] / "Audio_Overviews"
    transcript_files = list(audio_dir.glob("*_Transcript.md"))
    assert transcript_files, "transcript markdown should be generated"


def test_deep_research_workflow_gap_pipeline(tmp_path) -> None:
    vault = tmp_path / "Knowledge-Hub"
    manager = NotebookLMManager(
        vault_path=str(vault),
        nlm_client=_FakeNotebookLMClient(),
        cli=_FakeObsidianCLI(),
    )
    workflow = DeepResearchWorkflow(vault_path=str(vault), manager=manager)

    review = workflow.literature_review("AI Safety and Alignment", save_to_obsidian=True)
    assert review

    meta = manager.find_or_create_notebook("Literature_Review_AI_Safety_and_Alignment", category="Deep_Research")
    gaps = workflow.identify_research_gaps(meta["notebook_id"], "AI Safety")
    assert gaps == ["gap one", "gap two"]

    executed = workflow.auto_fill_gaps(meta["notebook_id"], gaps, max_new_sources=1)
    assert executed == ["gap one"]

    report_files = list((vault / "03_NotebookLM" / "Deep_Research_Reports").glob("*_Literature_Review.md"))
    assert report_files, "literature review report should be saved"
