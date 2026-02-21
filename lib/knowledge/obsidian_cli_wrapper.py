"""Wrapper for obsidian-cli tool."""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import List, Optional

from lib.common.logging import get_logger

logger = get_logger("knowledge.obsidian_cli")


class ObsidianCLIWrapper:
    """Python wrapper for the obsidian-cli command line tool."""

    def __init__(self, vault: Optional[str] = None):
        """Initialize the wrapper with an optional vault name."""
        self.bin_path = shutil.which("obsidian-cli")
        self.vault = vault

        if not self.bin_path:
            logger.warning("obsidian-cli not found in PATH")

    def _run_command(self, args: List[str]) -> subprocess.CompletedProcess:
        if not self.bin_path:
            raise RuntimeError("obsidian-cli not found in PATH")

        cmd = [self.bin_path] + args
        if self.vault:
            cmd.extend(["--vault", self.vault])

        logger.debug("Running obsidian-cli command: %s", " ".join(cmd))
        return subprocess.run(cmd, capture_output=True, text=True, check=False)

    def create_note(
        self,
        title: str,
        content: str,
        folder: Optional[str] = None,
        overwrite: bool = False,
        append: bool = False,
        open_note: bool = False,
    ) -> bool:
        """Create or update a note in the vault."""
        args = ["create", "--content", content]
        
        # Combine folder and title (v0.2.3 doesn't have --folder)
        full_name = title
        if folder:
            full_name = f"{folder.strip('/')}/{title}"
        elif "/" in title:
            # title already contains path
            pass

        args.append(full_name)

        if overwrite:
            args.append("--overwrite")
        if append:
            args.append("--append")
        if open_note:
            args.append("--open")

        res = self._run_command(args)
        if res.returncode != 0:
            logger.error("obsidian-cli create failed: %s", res.stderr or res.stdout)
            return False
        return True

    def open_note(self, title: str) -> bool:
        """Open a note in the Obsidian application."""
        res = self._run_command(["open", title])
        return res.returncode == 0

    def search(self, query: str, content: bool = False) -> bool:
        """Search for a note by title or content."""
        if content:
            res = self._run_command(["search-content", query])
        else:
            res = self._run_command(["search", query])
        return res.returncode == 0

    def daily_note(self, append: Optional[str] = None, open_note: bool = True) -> bool:
        """Open or update the daily note."""
        args = ["daily"]
        if append:
            args.extend(["--content", append, "--append"])
        if open_note:
            args.append("--open")
        
        res = self._run_command(args)
        return res.returncode == 0

    def move_note(self, source: str, destination: str) -> bool:
        """Move or rename a note, updating links."""
        res = self._run_command(["move", source, destination])
        return res.returncode == 0

    def delete_note(self, title: str) -> bool:
        """Delete a note from the vault."""
        res = self._run_command(["delete", title])
        return res.returncode == 0
