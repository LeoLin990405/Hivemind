"""Audio Overview workflow for Knowledge Hub v2.1."""
from __future__ import annotations

import glob
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse
from urllib.request import urlretrieve

from lib.common.logging import get_logger

from .notebooklm_manager import NotebookLMManager


logger = get_logger("knowledge.audio_overview_workflow")


class AudioOverviewWorkflow:
    """NotebookLM Audio Overview focused workflow."""

    def __init__(self, vault_path: str, manager: Optional[NotebookLMManager] = None):
        self.vault_path = Path(vault_path).expanduser()
        self.manager = manager or NotebookLMManager(vault_path=str(self.vault_path))

    def generate_podcast_from_notes(
        self,
        notes_pattern: str,
        notebook_title: Optional[str] = None,
        output_format: str = "mp3",
    ) -> Path:
        """Generate podcast-style audio overview from notes matched by pattern."""

        notes = self._collect_notes(notes_pattern)
        if not notes:
            raise FileNotFoundError(f"No notes found for pattern: {notes_pattern}")

        if not notebook_title:
            notebook_title = f"Audio_Session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        meta = self.manager.find_or_create_notebook(notebook_title, category="Audio_Generation")
        notebook_id = meta["notebook_id"]

        for note_path in notes:
            content = note_path.read_text(encoding="utf-8", errors="ignore")
            self.manager.add_text_source_with_tracking(
                notebook_id=notebook_id,
                title=note_path.stem,
                text_content=content,
                auto_rotate=True,
            )

        artifacts = self.manager.generate_all_artifacts(notebook_id=notebook_id, sync_to_obsidian=True)
        audio_value = artifacts.get("audio", "").strip()
        audio_path = self._download_audio(audio_value, notebook_title, output_format=output_format)

        transcript = self._transcribe_audio(audio_path)
        self._save_audio_to_obsidian(notebook_title, audio_path, transcript)

        return audio_path

    def interactive_audio_session(
        self,
        notebook_id: str,
        questions: Optional[List[str]] = None,
    ) -> str:
        """Start an interactive NotebookLM audio session through browser."""

        del questions
        notebook_url = f"https://notebooklm.google.com/notebook/{notebook_id}"

        opener: List[str]
        if shutil.which("open"):
            opener = ["open", notebook_url]
        elif shutil.which("xdg-open"):
            opener = ["xdg-open", notebook_url]
        else:
            logger.info("No browser opener found, returning URL only")
            return notebook_url

        try:
            subprocess.run(opener, check=False)
        except (RuntimeError, ValueError, TypeError, OSError):
            logger.warning("Failed to open browser for interactive audio session")

        return notebook_url

    def _collect_notes(self, pattern: str) -> List[Path]:
        vault_str = str(self.vault_path)
        raw_matches = glob.glob(f"{vault_str}/{pattern}", recursive=True)
        return [Path(item) for item in raw_matches if item.endswith(".md")]

    def _download_audio(self, value: str, title: str, output_format: str = "mp3") -> Path:
        media_dir = self.vault_path / "03_NotebookLM" / "Audio_Exports"
        media_dir.mkdir(parents=True, exist_ok=True)

        stamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
        output_format = (output_format or "mp3").lstrip(".")

        if value.startswith("http://") or value.startswith("https://"):
            target = media_dir / f"{stamp}_{self._safe_name(title)}.{output_format}"
            urlretrieve(value, target)
            return target

        parsed = urlparse(value)
        if parsed.scheme == "file" and parsed.path:
            src = Path(parsed.path)
            if src.exists():
                target = media_dir / f"{stamp}_{self._safe_name(title)}{src.suffix or f'.{output_format}'}"
                shutil.copy2(src, target)
                return target

        script_path = media_dir / f"{stamp}_{self._safe_name(title)}_Audio_Script.md"
        script_content = value or "Audio overview text not available from provider."
        script_path.write_text(
            "# Audio Overview Script\n\n"
            f"{script_content}\n",
            encoding="utf-8",
        )
        return script_path

    def _transcribe_audio(self, audio_path: Path) -> str:
        if audio_path.suffix.lower() in {".md", ".txt"}:
            return audio_path.read_text(encoding="utf-8", errors="ignore")

        return "(Auto transcription placeholder)"

    def _save_audio_to_obsidian(
        self,
        notebook_title: str,
        audio_path: Path,
        transcript: Optional[str] = None,
    ) -> Path:
        notebook_meta = self.manager.find_or_create_notebook(notebook_title, category="Audio_Generation")
        notebook_folder = self.vault_path / "03_NotebookLM" / "Active_Notebooks" / notebook_meta["folder"]
        audio_dir = notebook_folder / "Audio_Overviews"
        audio_dir.mkdir(parents=True, exist_ok=True)

        if audio_path.exists() and audio_path.parent != audio_dir:
            copied = audio_dir / audio_path.name
            shutil.copy2(audio_path, copied)
            audio_path = copied

        transcript_path = audio_dir / f"{datetime.now().strftime('%Y-%m-%d_%H%M%S')}_Transcript.md"
        
        frontmatter = {
            "type": "notebooklm-audio-transcript",
            "generated": datetime.now().isoformat(timespec="seconds"),
            "audio_file": audio_path.name,
            "tags": ["notebooklm", "audio", "transcript"],
        }
        
        body = (
            "# Audio Overview Transcript\n\n"
            f"![[{audio_path.relative_to(self.vault_path)}]]\n\n"
            "## Transcript\n"
            f"{(transcript or '').strip()}\n"
        )

        self.manager._write_markdown_note(transcript_path, frontmatter, body)
        return transcript_path

    @staticmethod
    def _safe_name(value: str) -> str:
        return "_".join(part for part in value.strip().split() if part) or "audio"
