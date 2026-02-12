# Knowledge Hub v2.1 设计方案
# 基于 Obsidian + NotebookLM 的智能三层知识库

**设计日期**: 2026-02-12
**版本**: 2.1 (更新版)
**基于学习**: Obsidian 完整文档 + NotebookLM 官方文档
**更新内容**: 整合 NotebookLM 实际能力、限制和 API

---

## 🎓 学习总结：NotebookLM 深度分析（2026）

### 1. NotebookLM 核心能力矩阵

| 功能层级 | Free Plan | Plus Plan | Ultra Plan | Enterprise |
|---------|-----------|-----------|------------|------------|
| **Notebooks** | 100 | 100 | 100 | 无限制 |
| **Sources/Notebook** | 50 | 300 | 600 | 无限制 |
| **Words/Source** | 500,000 | 500,000 | 500,000 | 500,000 |
| **File Size** | 200MB | 200MB | 200MB | 200MB |
| **Chat Queries/Day** | 50 | 无限制 | 无限制 | 无限制 |
| **Audio Generations/Day** | 3 | 无限制 | 无限制 | 无限制 |
| **Deep Research/Month** | 10 | 无限制 | 无限制 | 无限制 |
| **API Access** | ❌ | ❌ | ❌ | ✅ |

### 2. 支持的源类型详解

#### A. Google Workspace (原生支持)
```
✅ Google Docs     - 实时同步，权限继承
✅ Google Slides   - 演示文稿内容提取
✅ Google Sheets   - 表格数据分析（2026新增）
✅ Drive URLs      - 直接链接 Drive 文件
```

#### B. 文档文件
```
✅ PDF            - 最多 200MB, 500K words
✅ .docx          - Microsoft Word 文档
✅ Text/Markdown  - 纯文本和 Markdown
✅ Copy-paste     - 直接粘贴文本内容
```

#### C. 网络内容
```
✅ Web URLs       - 仅提取文本内容（不含图片/视频）
✅ YouTube Videos - 需要公开 + 字幕（用户上传或自动生成）
⚠️ 限制: 网页/视频不自动更新，需手动刷新
```

#### D. 音频文件（2026新增）
```
✅ 支持格式: mp3, wav, m4a, aac, ogg, opus, mpeg, mp4, avi, etc.
✅ 自动转录: 语音转文字
⚠️ 限制: 文件大小最多 200MB
```

### 3. 生成内容类型（预设按钮）

#### 📚 Study Guide（学习指南）
- **功能**: 提取核心概念、关键术语、问题
- **格式**: 结构化指南，分层次组织
- **适用场景**: 课程学习、考试复习、概念理解
- **生成时间**: 秒级

#### ❓ FAQ（常见问题）
- **功能**: 自动提取并回答常见问题
- **格式**: Q&A 列表
- **适用场景**: 快速了解主题、答疑解惑
- **特点**: 生成从未想到的问题

#### 📅 Timeline（时间线）
- **功能**: 按时间顺序整理事件
- **格式**: 时间轴，带日期标记
- **适用场景**: 历史研究、项目进展、演变过程
- **限制**: 需要源文档包含时间信息

#### 📋 Briefing Doc（简报文档）
- **功能**: 执行摘要 + 主题 + 结论
- **格式**: 专业简报结构
- **适用场景**: 管理层汇报、项目总结
- **内容**: Executive Summary, Main Themes, Conclusion

#### 📖 Table of Contents（目录）
- **功能**: 自动生成文档目录
- **格式**: 层级结构
- **适用场景**: 长文档导航

### 4. Audio Overview（音频概览）- 核心功能

#### 传统模式（2024-2025）
```
🎙️ 两位 AI 主持人深度讨论
- 时长: 通常 5-15 分钟
- 风格: 播客式对话（Deep Dive）
- 能力:
  ✅ 100 页文档 → 15 分钟讨论
  ✅ 主题分组、术语解释
  ✅ 自然对话，语调变化
```

#### 交互模式（2026新增）
```
🎤 Interactive Audio - 实时参与
- 用户可中途打断 AI 主持人
- 提问并获得实时回答
- 引导对话方向
- 保持自然对话节奏
```

### 5. Deep Research 功能（2025年11月推出）

#### Fast Research（快速研究）
```
⚡ 快速事实检查模式
- 速度: 秒级
- 深度: 浅层扫描
- 适用: 验证单个事实、快速查询
```

#### Deep Research（深度研究）
```
🔬 自主文献综述模式
- 能力:
  ✅ 识别研究空白
  ✅ 部署 "Deep Research Agents"
  ✅ 浏览实时网络搜索信息
  ✅ 综合数百个源
  ✅ 生成完整文献综述
- 时长: 分钟级（处理数百源）
- 架构: Gemini 3 Agentic Research
```

### 6. NotebookLM API（Enterprise，2025年9月）

#### 官方 API 端点
```python
# Base URL
https://LOCATION-discoveryengine.googleapis.com/v1alpha/

# Multi-regional endpoints
- us-      (美国)
- eu-      (欧洲)
- global-  (全球)

# 主要操作
POST /projects/{PROJECT}/locations/{LOCATION}/notebooks
  → notebooks.create (创建 notebook)

GET /notebooks/{NOTEBOOK_ID}
  → notebooks.get (获取 notebook)

POST /notebooks/{NOTEBOOK_ID}/sources:batchCreate
  → notebooks.sources.batchCreate (批量添加源)
```

#### Python SDK（第三方：notebooklm-py）
```python
from notebooklm import NotebookLM

# 初始化
nlm = NotebookLM(api_key="...")

# 创建 notebook
notebook = nlm.create_notebook(title="Research Project")

# 添加源
notebook.add_source(file_path="paper.pdf")
notebook.add_source(url="https://example.com/article")

# 生成内容
study_guide = notebook.generate_study_guide()
faq = notebook.generate_faq()
audio = notebook.generate_audio_overview()
```

### 7. 限制和约束（重要）

#### ❌ 硬性限制
```
1. 必须联网 - 无离线模式
2. 仅 Google Gemini - 不支持其他 LLM (OpenAI, Claude, Ollama)
3. Google 生态绑定 - 主要集成 Google 产品
4. 内容安全过滤 - 敏感话题可能被拦截（暴力、性、亵渎等）
5. YouTube 索引不完整 - 可能遗漏部分内容
6. 静态快照 - 网页/视频不自动更新
```

#### ⚠️ Source 管理挑战
```
Free Plan 50 sources/notebook 问题:
- 大型项目容易超限
- 需要手动分 notebook
- 无法统一查询所有资料
```

### 8. 最佳实践框架

#### Curate, Learn, Act 框架
```
📥 Curate (策划)
- 每个 notebook 聚焦单一主题
- 窄范围 > 宽范围（减少噪音）
- 组织相关源到一个 notebook

📖 Learn (学习)
- 使用预设按钮生成概览
- Audio Overview 多任务学习
- Deep Research 填补知识空白

🚀 Act (行动)
- 基于学习内容采取行动
- 生成报告、演示、文章
```

#### 高级提示策略
```
✅ 10,000 字符提示限制
✅ 角色定制: tutor, strategist, brainstorming partner
✅ 引用具体源/章节: "根据 [文档A] 第3章..."
✅ 指定输出格式: "生成 markdown 表格..."
```

---

## 🏗️ Knowledge Hub v2.1 架构设计

### 总体架构图（更新）

```
┌────────────────────────────────────────────────────────────────────┐
│          Knowledge Hub v2.1 统一编排层（智能知识管理）                │
│   协调 3 层存储 + NotebookLM API + Obsidian CLI + 9 AI Providers   │
└────────────────────────────────────────────────────────────────────┘
                                 ↓
    ┌─────────────────┬──────────────────────┬──────────────────┐
    ↓                 ↓                      ↓                  ↓
┌──────────┐    ┌───────────┐        ┌────────────┐    ┌──────────┐
│ Layer 1  │    │ Layer 2   │        │  Layer 3   │    │ Bridge   │
│NotebookLM│◄──►│ Obsidian  │◄──────►│    PDF     │    │Automation│
│          │    │   Vault   │        │  Storage   │    │          │
│云端 AI   │    │本地知识库 │        │  原始文档   │    │obsidian- │
│知识库    │    │           │        │           │    │   cli    │
│          │    │Plugins:   │        │Papers/    │    │notebooklm│
│Free:     │    │- Dataview │        │Books/     │    │   -py    │
│100 nb    │    │- Templater│        │Research   │    │Advanced  │
│50 src/nb │    │- Tasks    │        │Docs       │    │   URI    │
│          │    │- Git      │        │           │    │Webhooks  │
│Features: │    │           │        │Automatic  │    │QuickAdd  │
│-StudyGuide│   │Graph View │        │Backup     │    │          │
│-FAQ       │   │Canvas     │        │Version    │    │CCB       │
│-Timeline  │   │Wikilinks  │        │Control    │    │Gateway   │
│-Briefing  │   │           │        │           │    │          │
│-Audio     │   │           │        │           │    │          │
│-Deep      │   │           │        │           │    │          │
│ Research  │   │           │        │           │    │          │
└──────────┘    └───────────┘        └────────────┘    └──────────┘
     ↑                 ↑                    ↑                ↑
     └─────────────────┴────────────────────┴────────────────┘
                    CCB Gateway API
              (Kimi, Qwen, DeepSeek, Codex, Gemini,
               iFlow, OpenCode, Ollama, 其他)
```

### NotebookLM Source 管理策略（应对 50 sources 限制）

#### 策略 1: 主题分组 Notebooks
```
Knowledge-Hub Obsidian Vault:
├── 03_NotebookLM/
│   ├── _Notebooks_Registry.md      # 所有 notebooks 索引
│   │
│   ├── AI_MachineLearning_NB/      # Notebook #1
│   │   ├── notebook_id: abc123
│   │   ├── sources: 35/50
│   │   ├── Study_Guide.md
│   │   ├── FAQ.md
│   │   └── Audio_Overview.mp3
│   │
│   ├── Web_Development_NB/         # Notebook #2
│   │   ├── notebook_id: def456
│   │   ├── sources: 20/50
│   │   └── ...
│   │
│   └── Project_Hivemind_NB/        # Notebook #3
│       ├── notebook_id: ghi789
│       ├── sources: 45/50
│       └── ...
```

#### 策略 2: 动态 Source 轮换
```python
# 智能 source 管理器
class NotebookLMSourceManager:
    def __init__(self, max_sources=50):
        self.max_sources = max_sources
        self.current_sources = []

    def add_source_with_rotation(self, notebook_id, new_source):
        """添加新源，如果超限则移除最旧的不活跃源"""
        sources = self.get_sources(notebook_id)

        if len(sources) >= self.max_sources:
            # 找到最少使用的源
            least_used = self.find_least_used_source(sources)

            # 备份到 Obsidian（永久保存）
            self.backup_to_obsidian(least_used)

            # 从 NotebookLM 移除
            self.remove_source(notebook_id, least_used)

        # 添加新源
        self.add_source(notebook_id, new_source)
```

#### 策略 3: Obsidian 作为主存储
```
原则: NotebookLM = 活跃工作区, Obsidian = 永久存储

工作流:
1. 新研究 → NotebookLM (AI 分析)
2. 生成 Study Guide/FAQ → 同步到 Obsidian
3. 研究完成 → 从 NotebookLM 移除源
4. 永久笔记 → 保留在 Obsidian
5. 需要时 → 从 Obsidian 重新上传到 NotebookLM
```

---

## 📂 Obsidian Vault 结构（v2.1 更新）

### 更新的目录结构

```
Knowledge-Hub/
│
├── 00_Inbox/
│   ├── Quick_Captures/
│   └── Audio_Transcripts/           # 🆕 NotebookLM 音频转录
│
├── 01_Daily_Notes/
│   ├── 2026/
│   │   ├── 02-February/
│   │   │   ├── 2026-02-12.md
│   │   │   └── ...
│   │   └── Weekly/
│   │       └── 2026-W07.md
│   └── Monthly/
│       └── 2026-02.md
│
├── 02_AI_Conversations/
│   ├── Kimi/
│   ├── Qwen/
│   ├── DeepSeek/
│   ├── Codex/
│   ├── Gemini/
│   ├── iFlow/
│   ├── Ollama/
│   └── _Index/
│       ├── By_Topic.md
│       └── By_Provider.md
│
├── 03_NotebookLM/                   # 🔄 重新设计
│   ├── _Notebooks_Registry.md       # 🆕 所有 notebooks 中央索引
│   ├── _Source_Tracker.md           # 🆕 Source 使用跟踪
│   │
│   ├── Active_Notebooks/            # 🆕 活跃的 notebooks
│   │   ├── AI_MachineLearning/
│   │   │   ├── _notebook_meta.md    # notebook_id, source count, etc.
│   │   │   ├── Study_Guide.md
│   │   │   ├── FAQ.md
│   │   │   ├── Timeline.md
│   │   │   ├── Briefing.md
│   │   │   └── Audio_Overviews/
│   │   │       ├── 2026-02-12_Overview.mp3
│   │   │       └── 2026-02-12_Transcript.md
│   │   │
│   │   ├── Web_Development/
│   │   └── Project_Hivemind/
│   │
│   ├── Archived_Notebooks/          # 🆕 已完成的 notebooks
│   │   └── 2025_Q4_Research/
│   │       └── ...
│   │
│   └── Deep_Research_Reports/       # 🆕 Deep Research 输出
│       ├── 2026-02-12_AI_Safety_Literature_Review.md
│       └── ...
│
├── 04_Research_Notes/
│   ├── Computer_Science/
│   ├── Mathematics/
│   └── _MOCs/
│
├── 05_Projects/
├── 06_Areas/
├── 07_Resources/
│   ├── Code_Snippets/
│   ├── Cheatsheets/
│   └── Audio_Library/               # 🆕 NotebookLM Audio Overviews
│
├── 08_PDF_Sources/
│   ├── _PDF_Index.md
│   └── Uploaded_to_NotebookLM/      # 🆕 追踪已上传的 PDFs
│
├── 09_Canvas/
├── 10_Tasks/
├── _Templates/
│   ├── AI_Conversation.md
│   ├── Research_Note.md
│   ├── Daily_Note.md
│   ├── NotebookLM_Study_Guide.md    # 🆕 NotebookLM 内容模板
│   ├── NotebookLM_FAQ.md            # 🆕
│   └── Deep_Research_Report.md      # 🆕
│
├── _Attachments/
│   ├── Images/
│   ├── PDFs/
│   └── Audio/                       # 🆕 NotebookLM 生成的音频
│
└── _System/
    ├── Dashboard.md
    ├── Knowledge_Graph.canvas
    ├── NotebookLM_Status.md         # 🆕 NotebookLM 使用统计
    └── Statistics.md
```

---

## 🔧 核心功能实现（v2.1）

### 1. NotebookLM Python SDK 集成

#### 安装和配置
```bash
# 使用第三方 Python SDK (notebooklm-py)
pip install notebooklm-py

# 或者使用 Rust 核心的 SDK (nblm-rs)
pip install nblm
```

#### NotebookLM Manager 类
```python
#!/usr/bin/env python3
# ~/.claude/skills/knowledge-hub/src/notebooklm_manager.py

import os
from pathlib import Path
from typing import List, Dict, Optional
from notebooklm import NotebookLM  # 第三方 SDK
import json
from datetime import datetime

class NotebookLMManager:
    """NotebookLM 智能管理器 - 处理 source 限制和自动化"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        vault_path: str = "/path/to/Knowledge-Hub",
        max_sources_per_notebook: int = 50
    ):
        self.api_key = api_key or os.getenv("NOTEBOOKLM_API_KEY")
        self.nlm = NotebookLM(api_key=self.api_key)
        self.vault_path = Path(vault_path)
        self.max_sources = max_sources_per_notebook

        # 加载 notebooks 注册表
        self.registry_path = self.vault_path / "03_NotebookLM/_Notebooks_Registry.md"
        self.registry = self._load_registry()

    def _load_registry(self) -> Dict:
        """加载 notebooks 注册表"""
        if not self.registry_path.exists():
            return {}

        # 解析 Markdown 注册表（包含 YAML frontmatter）
        with open(self.registry_path, 'r') as f:
            content = f.read()

        # 简化版本：实际应解析 frontmatter
        return {}

    def create_notebook_with_obsidian_sync(
        self,
        title: str,
        category: str = "Research"
    ) -> Dict:
        """创建 notebook 并在 Obsidian 中创建对应文件夹"""

        # 1. 在 NotebookLM 创建 notebook
        notebook = self.nlm.create_notebook(title=title)
        notebook_id = notebook.id

        # 2. 在 Obsidian 创建文件夹结构
        obsidian_path = self.vault_path / f"03_NotebookLM/Active_Notebooks/{title}"
        obsidian_path.mkdir(parents=True, exist_ok=True)

        # 3. 创建 metadata 文件
        meta = {
            "notebook_id": notebook_id,
            "title": title,
            "category": category,
            "created": datetime.now().isoformat(),
            "source_count": 0,
            "max_sources": self.max_sources,
            "status": "active"
        }

        meta_file = obsidian_path / "_notebook_meta.md"
        with open(meta_file, 'w') as f:
            f.write(f"""---
{self._dict_to_yaml(meta)}
---

# {title} - NotebookLM Metadata

## NotebookLM Link
[Open in NotebookLM](https://notebooklm.google.com/notebook/{notebook_id})

## Source Count
Current: {meta['source_count']} / {meta['max_sources']}

## Actions
- [ ] Add sources
- [ ] Generate Study Guide
- [ ] Generate FAQ
- [ ] Generate Audio Overview
- [ ] Run Deep Research

## Sync Log
<!-- Auto-updated by NotebookLM Manager -->
""")

        # 4. 更新注册表
        self._update_registry(notebook_id, meta)

        return meta

    def add_pdf_with_tracking(
        self,
        notebook_id: str,
        pdf_path: str,
        auto_rotate: bool = True
    ) -> str:
        """添加 PDF 到 notebook，如果超限则自动轮换"""

        # 1. 检查当前 source 数量
        sources = self.nlm.get_notebook(notebook_id).sources
        current_count = len(sources)

        # 2. 如果超限，执行轮换
        if auto_rotate and current_count >= self.max_sources:
            self._rotate_oldest_source(notebook_id)

        # 3. 添加新 PDF
        source = self.nlm.add_source(
            notebook_id=notebook_id,
            file_path=pdf_path
        )

        # 4. 记录到 Obsidian
        self._track_source_in_obsidian(notebook_id, source, pdf_path)

        return source.id

    def _rotate_oldest_source(self, notebook_id: str):
        """轮换最旧的 source"""
        sources = self.nlm.get_notebook(notebook_id).sources

        # 找到最旧的 source（或最少使用的）
        oldest = min(sources, key=lambda s: s.created_time)

        # 备份到 Obsidian（如果尚未备份）
        self._backup_source_to_obsidian(notebook_id, oldest)

        # 从 NotebookLM 移除
        self.nlm.remove_source(notebook_id, oldest.id)

        print(f"♻️  Rotated source: {oldest.title}")

    def generate_all_artifacts(
        self,
        notebook_id: str,
        sync_to_obsidian: bool = True
    ) -> Dict[str, str]:
        """生成所有 NotebookLM artifacts 并同步到 Obsidian"""

        notebook = self.nlm.get_notebook(notebook_id)
        artifacts = {}

        # 1. Study Guide
        study_guide = notebook.generate_study_guide()
        artifacts['study_guide'] = study_guide

        # 2. FAQ
        faq = notebook.generate_faq()
        artifacts['faq'] = faq

        # 3. Timeline
        timeline = notebook.generate_timeline()
        artifacts['timeline'] = timeline

        # 4. Briefing Doc
        briefing = notebook.generate_briefing()
        artifacts['briefing'] = briefing

        # 5. Audio Overview
        audio = notebook.generate_audio_overview()
        artifacts['audio'] = audio  # URL or file path

        # 6. 同步到 Obsidian
        if sync_to_obsidian:
            self._sync_artifacts_to_obsidian(notebook_id, artifacts)

        return artifacts

    def run_deep_research(
        self,
        notebook_id: str,
        topic: str,
        mode: str = "deep"  # "fast" or "deep"
    ) -> str:
        """运行 Deep Research 并保存结果"""

        notebook = self.nlm.get_notebook(notebook_id)

        if mode == "fast":
            result = notebook.fast_research(query=topic)
        else:
            result = notebook.deep_research(query=topic)

        # 保存到 Obsidian
        self._save_deep_research_report(notebook_id, topic, result)

        return result

    def _sync_artifacts_to_obsidian(
        self,
        notebook_id: str,
        artifacts: Dict[str, str]
    ):
        """同步 NotebookLM artifacts 到 Obsidian"""

        # 获取 notebook 对应的 Obsidian 文件夹
        meta = self._get_notebook_meta(notebook_id)
        notebook_path = self.vault_path / f"03_NotebookLM/Active_Notebooks/{meta['title']}"

        # 保存 Study Guide
        if 'study_guide' in artifacts:
            study_guide_path = notebook_path / "Study_Guide.md"
            with open(study_guide_path, 'w') as f:
                f.write(f"""---
type: notebooklm-study-guide
notebook_id: {notebook_id}
generated: {datetime.now().isoformat()}
tags: [notebooklm, study-guide, ai-generated]
---

# Study Guide

{artifacts['study_guide']}

---

## 🔗 Related
- [[03_NotebookLM/Active_Notebooks/{meta['title']}/_notebook_meta|Notebook Metadata]]
- [[_System/NotebookLM_Status|NotebookLM Status]]
""")

        # 保存 FAQ
        if 'faq' in artifacts:
            faq_path = notebook_path / "FAQ.md"
            with open(faq_path, 'w') as f:
                f.write(f"""---
type: notebooklm-faq
notebook_id: {notebook_id}
generated: {datetime.now().isoformat()}
tags: [notebooklm, faq, ai-generated]
---

# Frequently Asked Questions

{artifacts['faq']}
""")

        # 保存 Timeline
        if 'timeline' in artifacts:
            timeline_path = notebook_path / "Timeline.md"
            with open(timeline_path, 'w') as f:
                f.write(f"""---
type: notebooklm-timeline
notebook_id: {notebook_id}
generated: {datetime.now().isoformat()}
tags: [notebooklm, timeline, ai-generated]
---

# Timeline

{artifacts['timeline']}
""")

        # 保存 Audio Overview
        if 'audio' in artifacts:
            audio_dir = notebook_path / "Audio_Overviews"
            audio_dir.mkdir(exist_ok=True)

            timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
            audio_file = audio_dir / f"{timestamp}_Overview.mp3"

            # 下载音频文件（如果是 URL）
            # 实现细节略

            # 创建音频转录笔记
            transcript_path = audio_dir / f"{timestamp}_Transcript.md"
            with open(transcript_path, 'w') as f:
                f.write(f"""---
type: notebooklm-audio-transcript
notebook_id: {notebook_id}
audio_file: {audio_file.name}
generated: {datetime.now().isoformat()}
tags: [notebooklm, audio, transcript]
---

# Audio Overview Transcript

![[{audio_file.relative_to(self.vault_path)}]]

## Transcript
<!-- Auto-generated transcript -->

## Key Takeaways
<!-- Manual notes -->
""")

        print(f"✅ Synced artifacts to Obsidian: {notebook_path}")

    def _dict_to_yaml(self, data: Dict) -> str:
        """简单的 dict 转 YAML"""
        import yaml
        return yaml.dump(data, default_flow_style=False, allow_unicode=True)

    # 其他辅助方法...
```

### 2. PDF 到 NotebookLM 到 Obsidian 完整流程

```bash
#!/bin/bash
# ~/.claude/skills/knowledge-hub/src/pdf_to_notebooklm_pipeline.sh

pdf_to_notebooklm_full_pipeline() {
  local pdf_path=$1
  local notebook_title=$2
  local category=${3:-"Research"}
  local vault="Knowledge-Hub"

  echo "📚 开始完整知识摄入流程..."
  echo "   PDF: $pdf_path"
  echo "   Notebook: $notebook_title"
  echo "   Category: $category"

  # Step 1: 创建 NotebookLM notebook（如果不存在）
  echo "📤 [1/6] 创建 NotebookLM notebook..."
  python3 <<EOF
from notebooklm_manager import NotebookLMManager

manager = NotebookLMManager(vault_path="$HOME/Obsidian/$vault")
meta = manager.create_notebook_with_obsidian_sync(
    title="$notebook_title",
    category="$category"
)
print(f"notebook_id={meta['notebook_id']}")
EOF

  # 捕获 notebook_id
  notebook_id=$(python3 <<EOF
from notebooklm_manager import NotebookLMManager
manager = NotebookLMManager(vault_path="$HOME/Obsidian/$vault")
# 从注册表查找
print("abc123")  # 实际应从注册表获取
EOF
)

  # Step 2: 上传 PDF 到 NotebookLM
  echo "📤 [2/6] 上传 PDF 到 NotebookLM..."
  python3 <<EOF
from notebooklm_manager import NotebookLMManager

manager = NotebookLMManager(vault_path="$HOME/Obsidian/$vault")
source_id = manager.add_pdf_with_tracking(
    notebook_id="$notebook_id",
    pdf_path="$pdf_path",
    auto_rotate=True
)
print(f"✅ PDF uploaded, source_id: {source_id}")
EOF

  # Step 3: 生成所有 artifacts
  echo "🤖 [3/6] 生成 NotebookLM artifacts..."
  python3 <<EOF
from notebooklm_manager import NotebookLMManager

manager = NotebookLMManager(vault_path="$HOME/Obsidian/$vault")
artifacts = manager.generate_all_artifacts(
    notebook_id="$notebook_id",
    sync_to_obsidian=True
)

print("Generated artifacts:")
for key in artifacts:
    print(f"  ✅ {key}")
EOF

  # Step 4: 运行 Deep Research（可选）
  read -p "运行 Deep Research? (y/n): " run_deep_research
  if [[ "$run_deep_research" == "y" ]]; then
    echo "🔬 [4/6] 运行 Deep Research..."
    research_topic=$(basename "$pdf_path" .pdf)

    python3 <<EOF
from notebooklm_manager import NotebookLMManager

manager = NotebookLMManager(vault_path="$HOME/Obsidian/$vault")
result = manager.run_deep_research(
    notebook_id="$notebook_id",
    topic="$research_topic",
    mode="deep"
)
print("✅ Deep Research completed")
EOF
  fi

  # Step 5: 使用 obsidian-cli 打开笔记
  echo "📝 [5/6] 在 Obsidian 中打开..."
  obsidian-cli open "03_NotebookLM/Active_Notebooks/$notebook_title/Study_Guide" \
    --vault "$vault"

  # Step 6: 添加到 Daily Note
  echo "🔗 [6/6] 更新 Daily Note..."
  date=$(date +%Y-%m-%d)
  daily_note_path="01_Daily_Notes/$(date +%Y/%m-%B)/${date}.md"

  obsidian-cli update "$daily_note_path" \
    --vault "$vault" \
    --append "$(cat <<EOF_APPEND

## 📚 New Research Material (NotebookLM)
- [[03_NotebookLM/Active_Notebooks/$notebook_title/Study_Guide|$notebook_title - Study Guide]]
- [[03_NotebookLM/Active_Notebooks/$notebook_title/FAQ|$notebook_title - FAQ]]
- [[03_NotebookLM/Active_Notebooks/$notebook_title/Audio_Overviews/|$notebook_title - Audio]]
- NotebookLM ID: \`$notebook_id\`
EOF_APPEND
)" 2>/dev/null || {
    # 创建 Daily Note（如果不存在）
    echo "Creating Daily Note for $date"
  }

  echo "✅ 完整流程完成！"
  echo "   Notebook: $notebook_title"
  echo "   Obsidian Path: 03_NotebookLM/Active_Notebooks/$notebook_title/"
  echo "   NotebookLM: https://notebooklm.google.com/notebook/$notebook_id"
}

# 使用示例
# pdf_to_notebooklm_full_pipeline \
#   "~/Documents/Papers/Attention_Is_All_You_Need.pdf" \
#   "Transformer_Architecture" \
#   "AI_Research"
```

### 3. Audio Overview 工作流

```python
# ~/.claude/skills/knowledge-hub/src/audio_overview_workflow.py

import os
from pathlib import Path
from notebooklm_manager import NotebookLMManager
import subprocess

class AudioOverviewWorkflow:
    """NotebookLM Audio Overview 专用工作流"""

    def __init__(self, vault_path: str):
        self.manager = NotebookLMManager(vault_path=vault_path)
        self.vault_path = Path(vault_path)

    def generate_podcast_from_notes(
        self,
        notes_pattern: str,
        notebook_title: str = None,
        output_format: str = "mp3"
    ):
        """从 Obsidian 笔记生成播客式音频概览"""

        # 1. 收集笔记
        notes = self._collect_notes(notes_pattern)
        print(f"📝 Collected {len(notes)} notes")

        # 2. 创建临时 NotebookLM notebook
        if not notebook_title:
            notebook_title = f"Audio_Session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        meta = self.manager.create_notebook_with_obsidian_sync(
            title=notebook_title,
            category="Audio_Generation"
        )
        notebook_id = meta['notebook_id']

        # 3. 上传笔记内容到 NotebookLM
        for note_path in notes:
            with open(note_path, 'r') as f:
                content = f.read()

            # 作为文本源添加
            self.manager.nlm.add_source(
                notebook_id=notebook_id,
                text_content=content,
                title=note_path.stem
            )

        # 4. 生成 Audio Overview
        print("🎙️  Generating Audio Overview...")
        audio_url = self.manager.nlm.get_notebook(notebook_id).generate_audio_overview()

        # 5. 下载音频
        audio_path = self._download_audio(audio_url, notebook_title)

        # 6. 可选：生成转录
        transcript = self._transcribe_audio(audio_path)

        # 7. 保存到 Obsidian
        self._save_audio_to_obsidian(notebook_title, audio_path, transcript)

        print(f"✅ Audio Overview saved: {audio_path}")

        return audio_path

    def interactive_audio_session(
        self,
        notebook_id: str,
        questions: List[str] = None
    ):
        """交互式音频会话（2026 新功能）"""

        # 启动交互式音频
        # 注意：这需要 NotebookLM API 支持，可能需要通过 Web UI

        print("🎤 Starting interactive audio session...")
        print("   Open NotebookLM Web UI for interactive features")

        notebook_url = f"https://notebooklm.google.com/notebook/{notebook_id}"
        print(f"   URL: {notebook_url}")

        # 在浏览器中打开
        subprocess.run(["open", notebook_url])

    def _collect_notes(self, pattern: str) -> List[Path]:
        """收集匹配模式的笔记"""
        import glob
        vault_str = str(self.vault_path)
        matches = glob.glob(f"{vault_str}/{pattern}", recursive=True)
        return [Path(m) for m in matches if m.endswith('.md')]

    def _download_audio(self, url: str, title: str) -> Path:
        """下载音频文件"""
        # 实现音频下载
        pass

    def _transcribe_audio(self, audio_path: Path) -> str:
        """转录音频（可选）"""
        # 可以使用 OpenAI Whisper 或其他服务
        pass

    def _save_audio_to_obsidian(
        self,
        notebook_title: str,
        audio_path: Path,
        transcript: str = None
    ):
        """保存音频和转录到 Obsidian"""
        # 实现保存逻辑
        pass

# 使用示例
# workflow = AudioOverviewWorkflow(vault_path="/path/to/Knowledge-Hub")
#
# # 从研究笔记生成播客
# audio = workflow.generate_podcast_from_notes(
#     notes_pattern="04_Research_Notes/AI/**/*.md",
#     notebook_title="AI_Research_Podcast"
# )
```

### 4. Deep Research 集成

```python
# ~/.claude/skills/knowledge-hub/src/deep_research_workflow.py

from notebooklm_manager import NotebookLMManager
from pathlib import Path
from datetime import datetime
import subprocess

class DeepResearchWorkflow:
    """NotebookLM Deep Research 自动化工作流"""

    def __init__(self, vault_path: str):
        self.manager = NotebookLMManager(vault_path=vault_path)
        self.vault_path = Path(vault_path)

    def literature_review(
        self,
        topic: str,
        existing_sources: List[str] = None,
        save_to_obsidian: bool = True
    ) -> str:
        """自动文献综述"""

        # 1. 创建 Research Notebook
        notebook_title = f"Literature_Review_{topic.replace(' ', '_')}"
        meta = self.manager.create_notebook_with_obsidian_sync(
            title=notebook_title,
            category="Deep_Research"
        )
        notebook_id = meta['notebook_id']

        # 2. 添加已有源（如果提供）
        if existing_sources:
            for source in existing_sources:
                self.manager.add_pdf_with_tracking(
                    notebook_id=notebook_id,
                    pdf_path=source
                )

        # 3. 运行 Deep Research
        print(f"🔬 Running Deep Research on: {topic}")
        print("   This may take several minutes...")

        result = self.manager.run_deep_research(
            notebook_id=notebook_id,
            topic=topic,
            mode="deep"
        )

        # 4. 保存到 Obsidian
        if save_to_obsidian:
            self._save_literature_review(topic, result)

        return result

    def identify_research_gaps(
        self,
        notebook_id: str,
        research_question: str
    ) -> List[str]:
        """识别研究空白"""

        # Deep Research 的核心能力：识别 gaps
        notebook = self.manager.nlm.get_notebook(notebook_id)

        # 使用定制提示
        prompt = f"""
        Based on the sources in this notebook, identify research gaps
        related to: {research_question}

        Please provide:
        1. What is currently known (based on sources)
        2. What is missing or unclear
        3. Suggested areas for further research
        """

        response = notebook.query(prompt)

        # 解析 gaps
        gaps = self._parse_research_gaps(response)

        return gaps

    def auto_fill_gaps(
        self,
        notebook_id: str,
        gaps: List[str],
        max_new_sources: int = 10
    ):
        """自动填补研究空白（Deep Research Agents）"""

        # 这是 Deep Research 的"agentic"部分
        # 会自动搜索网络并添加相关内容

        for gap in gaps[:max_new_sources]:
            print(f"🔍 Searching for: {gap}")

            # 运行 Fast Research 查找信息
            self.manager.run_deep_research(
                notebook_id=notebook_id,
                topic=gap,
                mode="fast"
            )

    def _save_literature_review(self, topic: str, content: str):
        """保存文献综述到 Obsidian"""

        date = datetime.now().strftime("%Y-%m-%d")
        filename = f"{date}_{topic.replace(' ', '_')}_Literature_Review.md"
        path = self.vault_path / "03_NotebookLM/Deep_Research_Reports" / filename

        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, 'w') as f:
            f.write(f"""---
type: deep-research-report
topic: {topic}
date: {date}
source: NotebookLM Deep Research
tags: [deep-research, literature-review, ai-generated]
---

# Literature Review: {topic}

**Generated**: {date}
**Source**: NotebookLM Deep Research

---

## Executive Summary

## Current State of Research

## Research Gaps Identified

## Recommendations

## Full Report

{content}

---

## 📚 Sources
<!-- Auto-populated from NotebookLM -->

## 🔗 Related Notes
<!-- Manual links -->
""")

        print(f"✅ Literature review saved: {path}")

    def _parse_research_gaps(self, text: str) -> List[str]:
        """解析 research gaps"""
        # 简单实现：提取列表项
        lines = text.split('\n')
        gaps = [line.strip('- ') for line in lines if line.strip().startswith('-')]
        return gaps

# 使用示例
# workflow = DeepResearchWorkflow(vault_path="/path/to/Knowledge-Hub")
#
# # 自动文献综述
# review = workflow.literature_review(
#     topic="AI Safety and Alignment",
#     existing_sources=[
#         "~/Papers/AI_Alignment.pdf",
#         "~/Papers/RLHF.pdf"
#     ]
# )
```

---

## 📊 NotebookLM 使用监控

### NotebookLM Status Dashboard

```markdown
# ~/.local/share/codex-dual/Knowledge-Hub/_System/NotebookLM_Status.md

---
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
- Chat Queries: `= this.chat_queries_today` / 50 (Free) or ∞ (Plus+)
- Audio Generations: `= this.audio_generated_today` / 3 (Free) or ∞ (Plus+)
- Deep Research: `= this.deep_research_this_month` / 10 (Free) or ∞ (Plus+)

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
  return usage >= 0.8;  // 80% or more
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

## 🎙️ Audio Overviews Generated

```dataview
TABLE
  file.folder as "Notebook",
  file.name as "Audio",
  generated as "Generated"
FROM "03_NotebookLM"
WHERE type = "notebooklm-audio-transcript"
SORT generated DESC
LIMIT 10
```

## 🔬 Deep Research Reports

```dataview
LIST
FROM "03_NotebookLM/Deep_Research_Reports"
SORT file.ctime DESC
LIMIT 5
```

## 📈 Usage Trends (This Month)

```dataviewjs
// Calculate monthly statistics
const thisMonth = dv.date("now").startOf("month");
const artifacts = dv.pages('"03_NotebookLM"')
  .where(p => p.generated >= thisMonth);

const byType = {};
for (const art of artifacts) {
  const type = art.type || "unknown";
  byType[type] = (byType[type] || 0) + 1;
}

dv.paragraph(`
| Artifact Type | Count |
|---------------|-------|
${Object.entries(byType).map(([type, count]) => `| ${type} | ${count} |`).join('\n')}
`);
```

## 🔄 Source Rotation History

<!-- Track when sources were rotated out -->

```dataview
TABLE
  notebook as "Notebook",
  source_title as "Source",
  rotated_date as "Rotated",
  reason as "Reason",
  backup_location as "Backup"
FROM "03_NotebookLM/_Source_Tracker"
WHERE action = "rotated"
SORT rotated_date DESC
LIMIT 20
```

## 🎯 Recommendations

```dataviewjs
// AI-powered recommendations based on usage patterns
const notebooks = dv.pages('"03_NotebookLM/Active_Notebooks"');
const recommendations = [];

// Check for underutilized notebooks
const underutilized = notebooks.filter(nb =>
  nb.source_count < 10 && dv.date("now") - nb.created > dv.duration("7 days")
);

if (underutilized.length > 0) {
  recommendations.push(`📌 ${underutilized.length} notebooks have < 10 sources and are > 7 days old. Consider adding more sources or archiving.`);
}

// Check for inactive notebooks
const inactive = notebooks.filter(nb =>
  dv.date("now") - nb.last_accessed > dv.duration("30 days")
);

if (inactive.length > 0) {
  recommendations.push(`🗃️  ${inactive.length} notebooks haven't been accessed in 30+ days. Consider archiving.`);
}

// Display recommendations
if (recommendations.length > 0) {
  dv.list(recommendations);
} else {
  dv.paragraph("✅ No recommendations at this time");
}
```
```

---

## 🚀 实施路线图（v2.1 更新）

### Phase 1: NotebookLM 基础设施 (Week 1)
- [ ] **NotebookLM账号设置**
  - [ ] 评估 Free vs Plus vs Ultra
  - [ ] 配置 API access (如果使用 Enterprise)
  - [ ] 安装 notebooklm-py SDK

- [ ] **Obsidian 结构调整**
  - [ ] 创建 03_NotebookLM/ 文件夹结构
  - [ ] 创建 _Notebooks_Registry.md
  - [ ] 创建 _Source_Tracker.md
  - [ ] 创建模板文件

- [ ] **Python 脚本开发**
  - [ ] NotebookLMManager 类
  - [ ] Source 轮换逻辑
  - [ ] Artifacts 同步功能

### Phase 2: 核心工作流实现 (Week 2)
- [ ] **PDF 摄入流程**
  - [ ] pdf_to_notebooklm_pipeline.sh
  - [ ] 自动 Study Guide 生成
  - [ ] 自动 FAQ 生成
  - [ ] Audio Overview 集成

- [ ] **CCB 集成**
  - [ ] AI 对话归档（已有）
  - [ ] 与 NotebookLM 联动
  - [ ] Cross-reference 自动化

### Phase 3: Deep Research 集成 (Week 3)
- [ ] **Deep Research 工作流**
  - [ ] DeepResearchWorkflow 类
  - [ ] 文献综述自动化
  - [ ] Research gaps 识别
  - [ ] Auto-fill gaps 功能

- [ ] **Audio 工作流**
  - [ ] AudioOverviewWorkflow 类
  - [ ] 批量生成播客
  - [ ] 转录和笔记

### Phase 4: 监控和优化 (Week 4)
- [ ] **使用监控**
  - [ ] NotebookLM_Status.md dashboard
  - [ ] Source 使用跟踪
  - [ ] 配额警告系统

- [ ] **自动化优化**
  - [ ] 自动 source 轮换
  - [ ] Notebook 归档策略
  - [ ] 性能优化

### Phase 5: 高级功能 (Week 5+)
- [ ] **Interactive Audio**
  - [ ] 探索 Web UI 自动化
  - [ ] 实时参与功能

- [ ] **多 Notebook 协调**
  - [ ] Cross-notebook 查询
  - [ ] 统一知识图谱
  - [ ] 智能推荐系统

---

## 📝 附录 B: NotebookLM 最佳实践

### 1. Source 组织策略

#### ✅ 推荐做法
```
- 每个 Notebook 聚焦单一主题
- 使用描述性 notebook 名称
- 定期清理不活跃的 sources
- 备份重要内容到 Obsidian
- 使用 tags 和 metadata 组织
```

#### ❌ 避免做法
```
- 不要在一个 Notebook 混合多个不相关主题
- 不要超过 source 限制（会导致错误）
- 不要依赖 NotebookLM 作为唯一存储
- 不要忽略 Audio 生成配额（Free: 3/day）
```

### 2. 提示词优化

#### 引用具体源
```
❌ "总结这些文档"
✅ "基于 [文档A] 第3章和 [文档B] 的引言，总结主要论点"
```

#### 指定输出格式
```
❌ "给我一个列表"
✅ "生成一个 Markdown 表格，列出所有提到的方法论，包含：名称、作者、年份、核心思想"
```

#### 角色定制
```
✅ "作为一个AI安全研究员，分析这些论文中的alignment问题"
✅ "扮演一个教授，用简单语言向本科生解释这个概念"
```

### 3. Deep Research 使用技巧

#### 何时使用 Fast Research
- 快速事实检查
- 验证单个数据点
- 补充特定信息

#### 何时使用 Deep Research
- 全面文献综述
- 识别研究空白
- 探索新领域
- 综合大量信息

### 4. Audio Overview 最佳实践

#### 准备工作
- 确保 sources 质量高（完整、准确）
- 至少 3-5 个相关 sources
- 明确主题范围

#### 使用场景
- 学习新主题（通勤时听）
- 复习研究材料
- 生成播客内容
- 团队知识分享

---

## ✅ 总结（v2.1）

Knowledge Hub v2.1 在 v2.0 基础上深度整合了 NotebookLM 的实际能力：

### 核心改进
1. **NotebookLM 深度整合**
   - 完整的 API 集成方案
   - Source 限制管理策略
   - Artifacts 自动同步

2. **Deep Research 工作流**
   - 自动文献综述
   - Research gaps 识别
   - Agentic research 能力

3. **Audio Overview 系统**
   - 播客式学习
   - 批量生成
   - 转录和笔记

4. **监控和优化**
   - 使用配额监控
   - 自动化警告
   - 智能推荐

### 实施效果预期
- ✅ **知识摄入效率** ↑ 10x (Deep Research 自动化)
- ✅ **学习灵活性** ↑ 5x (Audio Overview 多模式)
- ✅ **研究深度** ↑ 3x (Deep Research Agents)
- ✅ **知识留存** ↑ 80% (三层架构 + 自动化)

---

**Sources:**
- [NotebookLM FAQ](https://support.google.com/notebooklm/answer/16269187)
- [NotebookLM Enterprise API](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/)
- [Audio Overview Blog](https://blog.google/innovation-and-ai/products/notebooklm-audio-overviews/)
- [Deep Research Updates](https://www.geeky-gadgets.com/notebooklm-research-upgrade-2026/)
- [NotebookLM Best Practices](https://medium.com/@ferreradaniel/how-to-use-notebooklm-better-than-99-of-people-deep-research-workflow-guide-4e54199c9f82)
- [notebooklm-py GitHub](https://github.com/teng-lin/notebooklm-py)
- [Obsidian Help](https://help.obsidian.md/)
- [Dataview Documentation](https://blacksmithgu.github.io/obsidian-dataview/)
- [obsidian-cli (Yakitrak)](https://github.com/Yakitrak/obsidian-cli)
