#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHONPATH="${ROOT_DIR}/lib:${PYTHONPATH:-}"

pdf_to_notebooklm_full_pipeline() {
  local pdf_path="${1:?pdf_path is required}"
  local notebook_title="${2:?notebook_title is required}"
  local category="${3:-Research}"
  local vault_path="${KNOWLEDGE_HUB_VAULT:-$HOME/Knowledge-Hub}"

  if [[ ! -f "${pdf_path}" ]]; then
    echo "❌ PDF file not found: ${pdf_path}" >&2
    return 1
  fi

  echo "📚 开始完整知识摄入流程..."
  echo "   PDF: ${pdf_path}"
  echo "   Notebook: ${notebook_title}"
  echo "   Category: ${category}"
  echo "   Vault: ${vault_path}"

  echo "📤 [1/6] 创建/查找 NotebookLM notebook..."
  local notebook_id
  notebook_id="$({
    PYTHONPATH="${PYTHONPATH}" python3 - "${vault_path}" "${notebook_title}" "${category}" <<'PY'
import sys
from knowledge.notebooklm_manager import NotebookLMManager

vault_path, title, category = sys.argv[1], sys.argv[2], sys.argv[3]
manager = NotebookLMManager(vault_path=vault_path)
meta = manager.find_or_create_notebook(title=title, category=category)
print(meta["notebook_id"])
PY
  })"

  echo "📤 [2/6] 上传 PDF 到 NotebookLM..."
  PYTHONPATH="${PYTHONPATH}" python3 - "${vault_path}" "${notebook_id}" "${pdf_path}" <<'PY'
import sys
from knowledge.notebooklm_manager import NotebookLMManager

vault_path, notebook_id, pdf_path = sys.argv[1], sys.argv[2], sys.argv[3]
manager = NotebookLMManager(vault_path=vault_path)
source_id = manager.add_pdf_with_tracking(notebook_id=notebook_id, pdf_path=pdf_path, auto_rotate=True)
print(f"✅ PDF uploaded, source_id: {source_id}")
PY

  echo "🤖 [3/6] 生成 NotebookLM artifacts..."
  PYTHONPATH="${PYTHONPATH}" python3 - "${vault_path}" "${notebook_id}" <<'PY'
import sys
from knowledge.notebooklm_manager import NotebookLMManager

vault_path, notebook_id = sys.argv[1], sys.argv[2]
manager = NotebookLMManager(vault_path=vault_path)
artifacts = manager.generate_all_artifacts(notebook_id=notebook_id, sync_to_obsidian=True)
print("Generated artifacts:")
for key, value in artifacts.items():
    status = "✅" if value else "⚠️"
    print(f"  {status} {key}")
PY

  local run_deep_research="${RUN_DEEP_RESEARCH:-}"
  if [[ -z "${run_deep_research}" && -t 0 ]]; then
    read -r -p "运行 Deep Research? (y/n): " run_deep_research
  fi

  if [[ "${run_deep_research}" == "y" || "${run_deep_research}" == "Y" || "${run_deep_research}" == "1" || "${run_deep_research,,}" == "true" ]]; then
    echo "🔬 [4/6] 运行 Deep Research..."
    local research_topic
    research_topic="$(basename "${pdf_path}" .pdf)"
    PYTHONPATH="${PYTHONPATH}" python3 - "${vault_path}" "${notebook_id}" "${research_topic}" <<'PY'
import sys
from knowledge.notebooklm_manager import NotebookLMManager

vault_path, notebook_id, topic = sys.argv[1], sys.argv[2], sys.argv[3]
manager = NotebookLMManager(vault_path=vault_path)
manager.run_deep_research(notebook_id=notebook_id, topic=topic, mode="deep")
print("✅ Deep Research completed")
PY
  else
    echo "⏭️  [4/6] 跳过 Deep Research"
  fi

  echo "📝 [5/6] 打开 Obsidian 笔记..."
  if command -v obsidian-cli >/dev/null 2>&1; then
    obsidian-cli open "03_NotebookLM/Active_Notebooks/${notebook_title}/Study_Guide" --vault "$(basename "${vault_path}")" || true
  else
    echo "   obsidian-cli 未安装，跳过自动打开"
  fi

  echo "🔗 [6/6] 更新 Daily Note..."
  if command -v obsidian-cli >/dev/null 2>&1; then
    local date
    date="$(date +%Y-%m-%d)"
    local daily_note_path="01_Daily_Notes/$(date +%Y/%m-%B)/${date}.md"

    obsidian-cli update "${daily_note_path}" \
      --vault "$(basename "${vault_path}")" \
      --append "
## 📚 New Research Material (NotebookLM)
- [[03_NotebookLM/Active_Notebooks/${notebook_title}/Study_Guide|${notebook_title} - Study Guide]]
- [[03_NotebookLM/Active_Notebooks/${notebook_title}/FAQ|${notebook_title} - FAQ]]
- [[03_NotebookLM/Active_Notebooks/${notebook_title}/Audio_Overviews/|${notebook_title} - Audio]]
- NotebookLM ID: \\`${notebook_id}\\`
" || true
  else
    echo "   obsidian-cli 未安装，跳过 Daily Note 更新"
  fi

  echo "✅ 完整流程完成！"
  echo "   Notebook: ${notebook_title}"
  echo "   Obsidian Path: 03_NotebookLM/Active_Notebooks/${notebook_title}/"
  echo "   NotebookLM: https://notebooklm.google.com/notebook/${notebook_id}"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  pdf_to_notebooklm_full_pipeline "$@"
fi
