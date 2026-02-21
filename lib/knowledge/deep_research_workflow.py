"""Deep Research workflow for Knowledge Hub v2.1."""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import List, Optional

from .notebooklm_manager import NotebookLMManager


class DeepResearchWorkflow:
    """NotebookLM Deep Research automation workflow."""

    def __init__(self, vault_path: str, manager: Optional[NotebookLMManager] = None):
        self.vault_path = Path(vault_path).expanduser()
        self.manager = manager or NotebookLMManager(vault_path=str(self.vault_path))

    def literature_review(
        self,
        topic: str,
        existing_sources: Optional[List[str]] = None,
        save_to_obsidian: bool = True,
    ) -> str:
        """Run automated literature review and return generated report content."""

        notebook_title = f"Literature_Review_{self._safe_name(topic)}"
        meta = self.manager.find_or_create_notebook(notebook_title, category="Deep_Research")
        notebook_id = meta["notebook_id"]

        if existing_sources:
            for source in existing_sources:
                self.manager.add_pdf_with_tracking(
                    notebook_id=notebook_id,
                    pdf_path=source,
                    auto_rotate=True,
                )

        result = self.manager.run_deep_research(
            notebook_id=notebook_id,
            topic=topic,
            mode="deep",
        )

        if save_to_obsidian:
            self._save_literature_review(topic, result)

        return result

    def identify_research_gaps(
        self,
        notebook_id: str,
        research_question: str,
    ) -> List[str]:
        """Identify research gaps with a targeted notebook prompt."""

        prompt = (
            "Based on the notebook sources, identify research gaps related to "
            f"'{research_question}'. Return bullet points."
        )
        response = self.manager._query_notebook(notebook_id, prompt)
        return self._parse_research_gaps(response)

    def auto_fill_gaps(
        self,
        notebook_id: str,
        gaps: List[str],
        max_new_sources: int = 10,
    ) -> List[str]:
        """Try to fill gaps by running fast research for each gap."""

        executed: List[str] = []
        for gap in gaps[: max(0, int(max_new_sources))]:
            self.manager.run_deep_research(
                notebook_id=notebook_id,
                topic=gap,
                mode="fast",
            )
            executed.append(gap)
        return executed

    def _save_literature_review(self, topic: str, content: str) -> Path:
        date = datetime.now().strftime("%Y-%m-%d")
        filename = f"{date}_{self._safe_name(topic)}_Literature_Review.md"
        path = self.vault_path / "03_NotebookLM" / "Deep_Research_Reports" / filename

        frontmatter = {
            "type": "deep-research-report",
            "topic": topic,
            "date": date,
            "source": "NotebookLM Deep Research",
            "tags": ["deep-research", "literature-review", "ai-generated"],
        }
        
        body = (
            f"# Literature Review: {topic}\n\n"
            f"**Generated**: {date}\n"
            "**Source**: NotebookLM Deep Research\n\n"
            "## Executive Summary\n\n"
            "## Current State of Research\n\n"
            "## Research Gaps Identified\n\n"
            "## Recommendations\n\n"
            "## Full Report\n\n"
            f"{content}\n\n"
            "## 📚 Sources\n"
            "<!-- Auto-populated from NotebookLM -->\n\n"
            "## 🔗 Related Notes\n"
            "<!-- Manual links -->\n"
        )

        self.manager._write_markdown_note(path, frontmatter, body)
        return path

    @staticmethod
    def _parse_research_gaps(text: str) -> List[str]:
        lines = text.splitlines()
        return [line.strip().lstrip("- ").strip() for line in lines if line.strip().startswith("-")]

    @staticmethod
    def _safe_name(value: str) -> str:
        return "_".join(part for part in value.strip().split() if part) or "topic"
