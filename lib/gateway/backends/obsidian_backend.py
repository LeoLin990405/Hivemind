"""Obsidian CLI backend wrapper for command translation and safer execution."""

from __future__ import annotations

import re
import shlex
from typing import List

from lib.common.logging import get_logger

from .base_backend import BackendResult
from .cli import CLIBackend

logger = get_logger("gateway.backends.obsidian")


class ObsidianBackend(CLIBackend):
    """CLI backend specialized for Obsidian commands."""

    CMD_PREFIX = "[OBSIDIAN_CMD]"
    NL_PREFIX = "[OBSIDIAN_NL]"

    DIRECT_COMMANDS = {
        "create",
        "files",
        "search",
        "append",
        "daily",
        "daily:append",
        "daily:read",
        "base:query",
        "base:create",
        "bases",
        "folders",
        "file",
        "delete",
        "aliases",
        "backlinks",
        "history",
        "history:list",
        "bookmarks",
        "bookmark",
        "commands",
        "help",
    }

    BLOCKED_COMMANDS = {"daily"}

    def _build_command(self, message: str) -> List[str]:
        cli = self._find_cli()
        if not cli:
            raise ValueError(f"CLI command not found: {self.config.cli_command}")

        command_text = self._resolve_command_text(message)
        command_args = self._tokenize_command(command_text)

        if not command_args:
            raise ValueError("Empty Obsidian command")

        command_name = command_args[0].lower()
        if command_name in self.BLOCKED_COMMANDS:
            raise ValueError(
                f"Obsidian command '{command_name}' is blocked in gateway mode because it may open GUI"
            )

        return [cli, *command_args]

    def _resolve_command_text(self, message: str) -> str:
        text = (message or "").strip()
        if not text:
            raise ValueError("Empty Obsidian request")

        if text.startswith(self.CMD_PREFIX):
            return text[len(self.CMD_PREFIX) :].strip()
        if text.startswith(self.NL_PREFIX):
            return self._translate_nl_to_command(text[len(self.NL_PREFIX) :].strip())

        # Backward compatibility for direct gateway calls without marker
        first_token = text.split(" ", 1)[0].lower() if text else ""
        if first_token in self.DIRECT_COMMANDS:
            return text
        return self._translate_nl_to_command(text)

    def _tokenize_command(self, command_text: str) -> List[str]:
        try:
            return shlex.split(command_text)
        except ValueError as exc:
            raise ValueError(f"Invalid Obsidian command syntax: {exc}") from exc

    def _translate_nl_to_command(self, prompt: str) -> str:
        text = prompt.strip()
        if not text:
            raise ValueError("Empty Obsidian natural language prompt")

        lowered = text.lower()

        if any(keyword in lowered for keyword in ("help", "帮助", "命令列表", "可用命令")):
            return "help"

        if "文件夹" in text or "folders" in lowered:
            if any(keyword in text for keyword in ("总", "总数", "多少")) or "total" in lowered:
                return "folders total"
            return "folders"

        if any(keyword in text for keyword in ("文件", "笔记", "notes")) or "files" in lowered:
            if any(keyword in text for keyword in ("总", "总数", "多少")) or "total" in lowered:
                return "files total"
            if "列出" in text or "list" in lowered or "show" in lowered:
                return "files"

        search_match = re.search(r"(?:搜索|search)\s*(?:[:：]\s*)?(.*)$", text, flags=re.IGNORECASE)
        if search_match and search_match.group(1).strip():
            query = search_match.group(1).strip()
            return f"search query={shlex.quote(query)}"

        if any(keyword in text for keyword in ("创建", "新建", "create")):
            title = self._extract_title(text)
            content = self._extract_content(text)
            if title:
                if content:
                    return f"create name={shlex.quote(title)} content={shlex.quote(content)}"
                return f"create name={shlex.quote(title)}"

        if any(keyword in text for keyword in ("追加", "附加", "append")):
            file_name = self._extract_target_file(text)
            content = self._extract_content(text)
            if file_name and content:
                return f"append file={shlex.quote(file_name)} content={shlex.quote(content)}"

        # Fall back to help with explicit guidance
        raise ValueError(
            "Cannot translate natural language to Obsidian command. "
            "Please use direct mode, e.g. 'files total' or 'create name=... content=...'"
        )

    @staticmethod
    def _extract_title(text: str) -> str | None:
        patterns = [
            r"《([^》]+)》",
            r"[“\"]([^”\"]+)[”\"]",
            r"(?:名为|标题为|叫)\s*([\w\-\u4e00-\u9fff]+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                value = match.group(1).strip()
                if value:
                    return value
        return None

    @staticmethod
    def _extract_content(text: str) -> str | None:
        patterns = [
            r"(?:内容|content)\s*(?:[:：]\s*)?[“\"]([^”\"]+)[”\"]",
            r"(?:内容|content)\s*(?:[:：]\s*)?(.+)$",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, flags=re.IGNORECASE)
            if match:
                value = match.group(1).strip()
                if value:
                    return value
        return None

    @staticmethod
    def _extract_target_file(text: str) -> str | None:
        patterns = [
            r"(?:文件|笔记|file)\s*(?:[:：]\s*)?[“\"]([^”\"]+)[”\"]",
            r"(?:文件|笔记|file)\s*(?:[:：]\s*)?([\w\-\u4e00-\u9fff./]+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, flags=re.IGNORECASE)
            if match:
                value = match.group(1).strip()
                if value:
                    return value
        return None

    def _process_output(
        self,
        stdout: str,
        stderr: str,
        returncode: int,
        latency_ms: float,
        input_text: str = "",
    ) -> BackendResult:
        stdout = (stdout or "").strip()
        stderr = (stderr or "").strip()

        if returncode != 0:
            detail = stderr or stdout or f"Obsidian command failed with exit code {returncode}"
            return BackendResult.fail(
                f"Obsidian command failed: {detail}",
                latency_ms=latency_ms,
                metadata={"exit_code": returncode},
            )

        output = stdout or stderr
        if not output:
            output = "(Obsidian command completed)"

        return BackendResult.ok(
            response=output,
            latency_ms=latency_ms,
            metadata={"exit_code": returncode},
            raw_output=stdout,
        )

    async def health_check(self) -> bool:
        # Use binary existence check only to avoid false negatives from GUI-dependent behavior.
        return await super().health_check()
