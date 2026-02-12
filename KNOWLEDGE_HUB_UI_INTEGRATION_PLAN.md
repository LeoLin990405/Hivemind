# Knowledge Hub v2.1 完整集成计划
# 蜂巢 UI App + Gateway API + Obsidian CLI

**创建日期**: 2026-02-12
**目标**: 将 Knowledge Hub v2.1 完整集成到蜂巢桌面应用
**前置条件**: Codex 已完成 v2.1 核心代码（lib/knowledge/）

---

## 📊 当前状态检查

### ✅ 已完成
- [x] Knowledge Hub v2.1 核心代码
  - NotebookLMManager
  - AudioOverviewWorkflow
  - DeepResearchWorkflow
  - NotebookLMSourceManager
  - 5 个测试全部通过

- [x] 蜂巢 UI App 基础
  - 桌面应用（Electron + React）
  - Monitor 页面
  - Conversation 页面（多 AI Provider）
  - Settings 页面

- [x] Gateway API
  - 运行在 localhost:8765
  - 支持 9 个 AI Providers
  - 监控 API (/api/monitor/*)

### ❌ 未完成
- [ ] Obsidian CLI 安装和配置
- [ ] Knowledge Hub 前端页面
- [ ] Gateway API 的 Knowledge 路由
- [ ] 前后端连接
- [ ] 蜂巢 UI 中的 Knowledge Hub 入口

---

## 🎯 集成架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                  蜂巢桌面应用 (Electron)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              React Frontend                           │  │
│  │  ┌────────────┬────────────┬─────────────────────┐  │  │
│  │  │Conversation│  Monitor   │ Knowledge Hub (NEW) │  │  │
│  │  │   Page     │   Page     │       Page          │  │  │
│  │  └────────────┴────────────┴─────────────────────┘  │  │
│  │                       ↓                              │  │
│  │              IPC Bridge (Electron)                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTP API
┌─────────────────────────────────────────────────────────────┐
│              Gateway API (localhost:8765)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Existing Routes        │  New Routes (Knowledge v2) │  │
│  │  • /api/ask            │  • /knowledge/v2/notebook   │  │
│  │  • /api/providers      │  • /knowledge/v2/audio      │  │
│  │  • /api/monitor/*      │  • /knowledge/v2/research   │  │
│  └──────────────────────────────────────────────────────┘  │
│                       ↓                                     │
│         lib/knowledge/ (NotebookLM Manager + Workflows)    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    External Services                        │
│  ┌──────────────┬──────────────┬──────────────────────┐   │
│  │ NotebookLM   │ Obsidian CLI │      CCB Providers   │   │
│  │ (Google)     │  (Local)     │   (Kimi/Qwen/etc)   │   │
│  └──────────────┴──────────────┴──────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```
用户上传 PDF → 蜂巢 UI Knowledge Page
                     ↓
               Gateway API /knowledge/v2/pipeline/pdf-full
                     ↓
            NotebookLMManager.create_notebook()
            NotebookLMManager.add_pdf()
            NotebookLMManager.generate_artifacts()
                     ↓
                NotebookLM API (Google)
                     ↓
            同步到 Obsidian (obsidian-cli)
                     ↓
            返回结果到 UI (Study Guide, FAQ, Audio)
```

---

## 📋 完整集成计划

### Phase 1: 环境准备和工具安装（Day 1）

#### 1.1 安装 Obsidian CLI

```bash
# macOS (Homebrew)
brew tap yakitrak/yakitrak
brew install yakitrak/yakitrak/obsidian-cli

# 验证安装
obsidian-cli --version

# 配置默认 vault
obsidian-cli set-default --vault "Knowledge-Hub"
```

#### 1.2 安装 NotebookLM CLI（可选，用于测试）

```bash
# 安装社区工具
pip install notebooklm-mcp-cli

# 或者使用 Codex 已实现的 notebooklm_client.py
```

#### 1.3 创建 Obsidian Vault 结构

```bash
# 创建 Knowledge-Hub vault
mkdir -p ~/Obsidian/Knowledge-Hub

# 使用 NotebookLMManager 初始化结构
cd /Users/leo/.local/share/codex-dual
python3 <<EOF
from lib.knowledge import NotebookLMManager

manager = NotebookLMManager(vault_path="~/Obsidian/Knowledge-Hub")
manager.initialize_vault_structure()
print("✅ Vault structure initialized")
EOF
```

#### 1.4 环境变量配置

```bash
# ~/.zshrc or ~/.bashrc
export NOTEBOOKLM_API_KEY="your_api_key_if_enterprise"
export OBSIDIAN_VAULT_PATH="$HOME/Obsidian/Knowledge-Hub"
export KNOWLEDGE_HUB_GATEWAY="http://localhost:8765"

# Ultra 账号配置
export NOTEBOOKLM_PLAN="ultra"
export NOTEBOOKLM_MAX_SOURCES=600
```

---

### Phase 2: Gateway API 集成（Day 1-2）

#### 2.1 创建 Knowledge v2 路由

**文件**: `lib/gateway/routes/knowledge_v2.py`

```python
"""
Knowledge Hub v2.1 API Routes
集成 NotebookLM + Obsidian + Deep Research + Audio
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
import tempfile
import os
from pathlib import Path

from lib.knowledge import (
    NotebookLMManager,
    AudioOverviewWorkflow,
    DeepResearchWorkflow,
    NotebookLMSourceManager
)

router = APIRouter(prefix="/knowledge/v2", tags=["Knowledge Hub v2.1"])

# ============ Pydantic Models ============

class NotebookCreateRequest(BaseModel):
    title: str
    category: str = "Research"
    vault_path: Optional[str] = None

class SourceAddRequest(BaseModel):
    notebook_id: str
    auto_rotate: bool = True

class ArtifactsGenerateRequest(BaseModel):
    notebook_id: str
    sync_to_obsidian: bool = True
    generate_audio: bool = True

class DeepResearchRequest(BaseModel):
    topic: str
    existing_sources: Optional[List[str]] = []
    mode: str = "deep"  # "fast" or "deep"

class AudioGenerateRequest(BaseModel):
    notes_pattern: str
    notebook_title: Optional[str] = None
    output_format: str = "mp3"

class CCBSaveRequest(BaseModel):
    provider: str
    query: str
    response: str
    notebook_id: Optional[str] = None
    auto_create_notebook: bool = True

# ============ Notebook 管理 ============

@router.post("/notebook/create")
async def create_notebook(req: NotebookCreateRequest):
    """创建 NotebookLM notebook 并初始化 Obsidian 结构"""
    try:
        manager = NotebookLMManager(vault_path=req.vault_path)
        meta = manager.create_notebook_with_obsidian_sync(
            title=req.title,
            category=req.category
        )

        return {
            "status": "success",
            "notebook_id": meta["notebook_id"],
            "title": meta["title"],
            "obsidian_path": str(meta.get("obsidian_path", "")),
            "source_count": meta.get("source_count", 0),
            "max_sources": meta.get("max_sources", 600)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notebook/list")
async def list_notebooks():
    """列出所有 notebooks"""
    try:
        manager = NotebookLMManager()
        notebooks = manager.list_notebooks()

        return {
            "status": "success",
            "count": len(notebooks),
            "notebooks": notebooks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notebook/{notebook_id}")
async def get_notebook(notebook_id: str):
    """获取 notebook 详情"""
    try:
        manager = NotebookLMManager()
        meta = manager.get_notebook_meta(notebook_id)

        return {
            "status": "success",
            "notebook": meta
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

# ============ Source 管理 ============

@router.post("/notebook/{notebook_id}/source/upload")
async def upload_source(
    notebook_id: str,
    file: UploadFile = File(...),
    auto_rotate: bool = True
):
    """上传文件到 NotebookLM（支持 PDF, DOCX, TXT 等）"""
    try:
        # 保存临时文件
        suffix = Path(file.filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # 上传到 NotebookLM
        manager = NotebookLMManager()
        source_id = manager.add_pdf_with_tracking(
            notebook_id=notebook_id,
            pdf_path=tmp_path,
            auto_rotate=auto_rotate
        )

        # 清理临时文件
        os.unlink(tmp_path)

        return {
            "status": "success",
            "source_id": source_id,
            "filename": file.filename,
            "auto_rotated": auto_rotate
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notebook/{notebook_id}/sources")
async def list_sources(notebook_id: str):
    """列出 notebook 的所有 sources"""
    try:
        manager = NotebookLMManager()
        sources = manager.list_sources(notebook_id)

        return {
            "status": "success",
            "notebook_id": notebook_id,
            "count": len(sources),
            "sources": sources
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ Artifacts 生成 ============

@router.post("/notebook/{notebook_id}/artifacts/generate")
async def generate_artifacts(notebook_id: str, req: ArtifactsGenerateRequest):
    """生成所有 NotebookLM artifacts（Study Guide, FAQ, Timeline, Briefing, Audio）"""
    try:
        manager = NotebookLMManager()
        artifacts = manager.generate_all_artifacts(
            notebook_id=notebook_id,
            sync_to_obsidian=req.sync_to_obsidian
        )

        return {
            "status": "success",
            "notebook_id": notebook_id,
            "artifacts": {
                "study_guide": {
                    "generated": bool(artifacts.get("study_guide")),
                    "path": artifacts.get("study_guide_path")
                },
                "faq": {
                    "generated": bool(artifacts.get("faq")),
                    "path": artifacts.get("faq_path")
                },
                "timeline": {
                    "generated": bool(artifacts.get("timeline")),
                    "path": artifacts.get("timeline_path")
                },
                "briefing": {
                    "generated": bool(artifacts.get("briefing")),
                    "path": artifacts.get("briefing_path")
                },
                "audio": {
                    "generated": bool(artifacts.get("audio")),
                    "url": artifacts.get("audio_url"),
                    "path": artifacts.get("audio_path")
                }
            },
            "obsidian_synced": req.sync_to_obsidian
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notebook/{notebook_id}/artifacts/{artifact_type}")
async def get_artifact(notebook_id: str, artifact_type: str):
    """获取特定 artifact 的内容（study-guide, faq, timeline, briefing）"""
    try:
        manager = NotebookLMManager()
        content = manager.get_artifact(notebook_id, artifact_type)

        return {
            "status": "success",
            "notebook_id": notebook_id,
            "artifact_type": artifact_type,
            "content": content
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

# ============ Deep Research ============

@router.post("/research/literature-review")
async def literature_review(req: DeepResearchRequest, background_tasks: BackgroundTasks):
    """自动文献综述（Deep Research）"""
    try:
        workflow = DeepResearchWorkflow()

        # 异步执行（因为可能需要几分钟）
        def run_research():
            result = workflow.literature_review(
                topic=req.topic,
                existing_sources=req.existing_sources,
                mode=req.mode
            )
            return result

        # 立即返回任务 ID，实际执行在后台
        task_id = f"research_{hash(req.topic)}"
        background_tasks.add_task(run_research)

        return {
            "status": "started",
            "task_id": task_id,
            "topic": req.topic,
            "mode": req.mode,
            "message": "Deep Research started in background. Check /research/status/{task_id} for progress."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/research/{notebook_id}/identify-gaps")
async def identify_gaps(notebook_id: str, research_question: str):
    """识别研究空白"""
    try:
        workflow = DeepResearchWorkflow()
        gaps = workflow.identify_research_gaps(
            notebook_id=notebook_id,
            research_question=research_question
        )

        return {
            "status": "success",
            "notebook_id": notebook_id,
            "research_question": research_question,
            "gaps_count": len(gaps),
            "gaps": gaps
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ Audio Overview ============

@router.post("/audio/generate-from-notes")
async def generate_audio_from_notes(req: AudioGenerateRequest):
    """从 Obsidian 笔记生成 Audio Overview（播客）"""
    try:
        workflow = AudioOverviewWorkflow()
        audio_path = workflow.generate_podcast_from_notes(
            notes_pattern=req.notes_pattern,
            notebook_title=req.notebook_title,
            output_format=req.output_format
        )

        return {
            "status": "success",
            "audio_path": str(audio_path),
            "notebook_title": req.notebook_title,
            "format": req.output_format
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/audio/download/{filename}")
async def download_audio(filename: str):
    """下载 Audio Overview 文件"""
    try:
        # 从 Obsidian vault 获取音频文件
        vault_path = Path(os.getenv("OBSIDIAN_VAULT_PATH", "~/Obsidian/Knowledge-Hub")).expanduser()
        audio_path = vault_path / "_Attachments" / "Audio" / filename

        if not audio_path.exists():
            raise HTTPException(status_code=404, detail="Audio file not found")

        return FileResponse(
            path=audio_path,
            media_type="audio/mpeg",
            filename=filename
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 完整流水线 ============

@router.post("/pipeline/pdf-full")
async def pdf_full_pipeline(
    file: UploadFile = File(...),
    notebook_title: Optional[str] = None,
    category: str = "Research",
    run_deep_research: bool = False,
    background_tasks: BackgroundTasks = None
):
    """
    完整 PDF 知识摄入流水线：
    1. 创建 notebook
    2. 上传 PDF
    3. 生成 artifacts
    4. 可选: Deep Research
    5. 同步到 Obsidian
    6. 更新 Daily Note
    """
    try:
        # 保存临时文件
        suffix = Path(file.filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        title = notebook_title or Path(file.filename).stem

        # 调用 shell 脚本（Codex 已实现）
        import subprocess
        result = subprocess.run([
            "bash",
            "/Users/leo/.local/share/codex-dual/scripts/pdf_to_notebooklm_pipeline.sh",
            tmp_path,
            title,
            category,
            "y" if run_deep_research else "n"
        ], capture_output=True, text=True, timeout=600)  # 10 分钟超时

        # 清理临时文件
        os.unlink(tmp_path)

        if result.returncode == 0:
            return {
                "status": "success",
                "notebook_title": title,
                "category": category,
                "deep_research_executed": run_deep_research,
                "output": result.stdout
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Pipeline failed: {result.stderr}"
            )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Pipeline timeout (>10 minutes)")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ CCB 集成 ============

@router.post("/ccb/save-conversation")
async def save_ccb_conversation(req: CCBSaveRequest):
    """将 CCB AI 对话保存到 NotebookLM"""
    try:
        manager = NotebookLMManager()

        # 如果没有指定 notebook，自动创建
        notebook_id = req.notebook_id
        if not notebook_id and req.auto_create_notebook:
            meta = manager.create_notebook_with_obsidian_sync(
                title=f"{req.provider}_Conversations",
                category="AI_Conversations"
            )
            notebook_id = meta["notebook_id"]

        # 将对话作为文本源添加
        from datetime import datetime
        conversation_text = f"""
# Query
{req.query}

# Response ({req.provider})
{req.response}

---
Created: {datetime.now().isoformat()}
Provider: {req.provider}
"""

        source_id = manager.add_text_source(
            notebook_id=notebook_id,
            text_content=conversation_text,
            title=f"{req.provider}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        )

        return {
            "status": "success",
            "notebook_id": notebook_id,
            "source_id": source_id,
            "provider": req.provider
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ 状态和监控 ============

@router.get("/status")
async def get_status():
    """获取 Knowledge Hub 使用状态"""
    try:
        manager = NotebookLMManager()
        status = manager.get_dashboard_status()

        return {
            "status": "success",
            "account": {
                "plan": os.getenv("NOTEBOOKLM_PLAN", "ultra"),
                "limits": {
                    "sources_per_notebook": int(os.getenv("NOTEBOOKLM_MAX_SOURCES", "600")),
                    "chat_queries": "unlimited",
                    "audio_generations": "unlimited",
                    "deep_research": "unlimited"
                }
            },
            "vault": {
                "path": os.getenv("OBSIDIAN_VAULT_PATH", "~/Obsidian/Knowledge-Hub"),
                "obsidian_cli_installed": os.system("which obsidian-cli") == 0
            },
            "usage": status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """健康检查"""
    checks = {
        "obsidian_cli": os.system("which obsidian-cli >/dev/null 2>&1") == 0,
        "vault_exists": Path(os.getenv("OBSIDIAN_VAULT_PATH", "~/Obsidian/Knowledge-Hub")).expanduser().exists(),
        "notebooklm_client": True,  # 检查 notebooklm_client 是否可用
    }

    all_healthy = all(checks.values())

    return {
        "status": "healthy" if all_healthy else "degraded",
        "checks": checks
    }
```

#### 2.2 注册路由到 Gateway

**文件**: `lib/gateway/gateway_server.py`

```python
# 在现有代码中添加

from lib.gateway.routes import knowledge_v2

# 在 app 初始化后添加
app.include_router(knowledge_v2.router)

print("✅ Knowledge Hub v2.1 routes registered")
```

#### 2.3 测试 Gateway API

```bash
# 启动 Gateway
cd /Users/leo/.local/share/codex-dual
python3 -m lib.gateway.gateway_server --port 8765

# 测试健康检查
curl http://localhost:8765/knowledge/v2/health

# 测试创建 notebook
curl -X POST http://localhost:8765/knowledge/v2/notebook/create \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Notebook", "category": "Research"}'

# 测试上传 PDF
curl -X POST http://localhost:8765/knowledge/v2/notebook/abc123/source/upload \
  -F "file=@test.pdf" \
  -F "auto_rotate=true"
```

---

### Phase 3: 蜂巢 UI 前端集成（Day 2-4）

#### 3.1 创建 Knowledge Hub 页面

**目录结构**:
```
AionUi/src/renderer/pages/knowledge/
├── index.tsx                    # Knowledge Hub 主页面
├── components/
│   ├── NotebookList.tsx        # Notebook 列表
│   ├── NotebookDetail.tsx      # Notebook 详情
│   ├── SourceUploader.tsx      # 文件上传组件
│   ├── ArtifactsViewer.tsx     # Artifacts 查看器
│   ├── AudioPlayer.tsx         # Audio Overview 播放器
│   ├── DeepResearchPanel.tsx   # Deep Research 面板
│   └── StatusDashboard.tsx     # 状态监控
└── styles/
    └── knowledge.css
```

#### 3.2 主页面实现

**文件**: `AionUi/src/renderer/pages/knowledge/index.tsx`

```typescript
/**
 * Knowledge Hub v2.1 主页面
 * 集成 NotebookLM + Obsidian + Deep Research + Audio
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Button,
  Upload,
  Message,
  Spin,
  Layout
} from '@arco-design/web-react';
import { IconPlus, IconBook, IconSound, IconExperiment } from '@arco-design/web-react/icon';
import { useTranslation } from 'react-i18next';

import NotebookList from './components/NotebookList';
import NotebookDetail from './components/NotebookDetail';
import ArtifactsViewer from './components/ArtifactsViewer';
import AudioPlayer from './components/AudioPlayer';
import DeepResearchPanel from './components/DeepResearchPanel';
import StatusDashboard from './components/StatusDashboard';

import './styles/knowledge.css';

const { Header, Content, Sider } = Layout;
const TabPane = Tabs.TabPane;

interface Notebook {
  notebook_id: string;
  title: string;
  category: string;
  source_count: number;
  max_sources: number;
  created: string;
}

const KnowledgeHubPage: React.FC = () => {
  const { t } = useTranslation();

  // State
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('notebooks');

  // Fetch notebooks on mount
  useEffect(() => {
    fetchNotebooks();
  }, []);

  const fetchNotebooks = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8765/knowledge/v2/notebook/list');
      const data = await response.json();

      if (data.status === 'success') {
        setNotebooks(data.notebooks);
      }
    } catch (error) {
      Message.error(t('knowledge.fetchError'));
      console.error('Failed to fetch notebooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotebook = async (title: string, category: string) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8765/knowledge/v2/notebook/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category })
      });

      const data = await response.json();

      if (data.status === 'success') {
        Message.success(t('knowledge.notebookCreated'));
        fetchNotebooks();
      }
    } catch (error) {
      Message.error(t('knowledge.createError'));
      console.error('Failed to create notebook:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPDF = async (file: File, notebookId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('auto_rotate', 'true');

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8765/knowledge/v2/notebook/${notebookId}/source/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      const data = await response.json();

      if (data.status === 'success') {
        Message.success(t('knowledge.sourceUploaded'));
        // 刷新当前 notebook
        if (selectedNotebook) {
          // TODO: 刷新 notebook 详情
        }
      }
    } catch (error) {
      Message.error(t('knowledge.uploadError'));
      console.error('Failed to upload source:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="knowledge-hub-page">
      <Layout style={{ height: '100vh' }}>
        {/* 左侧边栏 - Notebook 列表 */}
        <Sider width={300} className="knowledge-sider">
          <div className="sider-header">
            <h2>{t('knowledge.title')}</h2>
            <Button
              type="primary"
              icon={<IconPlus />}
              onClick={() => {
                // TODO: 显示创建 notebook 对话框
              }}
            >
              {t('knowledge.createNotebook')}
            </Button>
          </div>

          <Spin loading={loading}>
            <NotebookList
              notebooks={notebooks}
              selectedNotebook={selectedNotebook}
              onSelectNotebook={setSelectedNotebook}
            />
          </Spin>
        </Sider>

        {/* 主内容区 */}
        <Layout>
          <Header className="knowledge-header">
            <Tabs
              activeTab={activeTab}
              onChange={setActiveTab}
              type="card"
            >
              <TabPane
                key="notebooks"
                title={
                  <span>
                    <IconBook /> {t('knowledge.notebooks')}
                  </span>
                }
              />
              <TabPane
                key="audio"
                title={
                  <span>
                    <IconSound /> {t('knowledge.audio')}
                  </span>
                }
              />
              <TabPane
                key="research"
                title={
                  <span>
                    <IconExperiment /> {t('knowledge.deepResearch')}
                  </span>
                }
              />
              <TabPane
                key="status"
                title={t('knowledge.status')}
              />
            </Tabs>
          </Header>

          <Content className="knowledge-content">
            {activeTab === 'notebooks' && (
              <div>
                {selectedNotebook ? (
                  <NotebookDetail
                    notebook={selectedNotebook}
                    onUploadPDF={handleUploadPDF}
                  />
                ) : (
                  <Card className="empty-state">
                    <p>{t('knowledge.selectNotebook')}</p>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'audio' && (
              <AudioPlayer />
            )}

            {activeTab === 'research' && (
              <DeepResearchPanel />
            )}

            {activeTab === 'status' && (
              <StatusDashboard />
            )}
          </Content>
        </Layout>
      </Layout>
    </div>
  );
};

export default KnowledgeHubPage;
```

#### 3.3 添加路由

**文件**: `AionUi/src/renderer/App.tsx` (或路由配置文件)

```typescript
import KnowledgeHubPage from './pages/knowledge';

// 在路由配置中添加
<Route path="/knowledge" element={<KnowledgeHubPage />} />
```

#### 3.4 添加导航菜单

**文件**: `AionUi/src/renderer/components/Sidebar/index.tsx`

```typescript
// 在侧边栏菜单中添加 Knowledge Hub 入口
<Menu.Item key="knowledge">
  <IconBook />
  {t('sidebar.knowledge')}
</Menu.Item>
```

#### 3.5 国际化

**文件**: `AionUi/src/renderer/i18n/locales/zh-CN.json`

```json
{
  "knowledge": {
    "title": "知识中心",
    "createNotebook": "创建 Notebook",
    "selectNotebook": "请选择一个 Notebook",
    "notebooks": "笔记本",
    "audio": "音频概览",
    "deepResearch": "深度研究",
    "status": "状态监控",
    "notebookCreated": "Notebook 创建成功",
    "sourceUploaded": "文件上传成功",
    "fetchError": "获取数据失败",
    "createError": "创建失败",
    "uploadError": "上传失败",
    "uploadPDF": "上传 PDF",
    "generateArtifacts": "生成学习材料",
    "studyGuide": "学习指南",
    "faq": "常见问题",
    "timeline": "时间线",
    "briefing": "简报",
    "audioOverview": "音频概览",
    "runDeepResearch": "运行深度研究",
    "literatureReview": "文献综述",
    "identifyGaps": "识别研究空白"
  }
}
```

---

### Phase 4: Obsidian CLI 集成（Day 4-5）

#### 4.1 Obsidian CLI 包装器

**文件**: `lib/knowledge/obsidian_cli_wrapper.py`

```python
"""
Obsidian CLI 包装器
简化 obsidian-cli 调用
"""

import subprocess
import os
from pathlib import Path
from typing import Optional, List

class ObsidianCLI:
    """Obsidian CLI 包装器"""

    def __init__(self, vault_name: str = "Knowledge-Hub"):
        self.vault_name = vault_name
        self.cli_path = "obsidian-cli"

        # 检查 CLI 是否安装
        if subprocess.run(["which", self.cli_path], capture_output=True).returncode != 0:
            raise RuntimeError("obsidian-cli not found. Please install it first.")

    def create_note(
        self,
        note_path: str,
        content: str,
        open_after: bool = False
    ) -> bool:
        """创建笔记"""
        try:
            cmd = [
                self.cli_path,
                "create",
                note_path,
                "--vault", self.vault_name,
                "--content", content
            ]

            if open_after:
                cmd.append("--open")

            result = subprocess.run(cmd, capture_output=True, text=True)
            return result.returncode == 0
        except Exception as e:
            print(f"Failed to create note: {e}")
            return False

    def update_note(
        self,
        note_path: str,
        content: str,
        mode: str = "append"  # "append" or "prepend"
    ) -> bool:
        """更新笔记"""
        try:
            cmd = [
                self.cli_path,
                "update",
                note_path,
                "--vault", self.vault_name,
                f"--{mode}", content
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)
            return result.returncode == 0
        except Exception as e:
            print(f"Failed to update note: {e}")
            return False

    def open_note(self, note_path: str) -> bool:
        """在 Obsidian 中打开笔记"""
        try:
            cmd = [
                self.cli_path,
                "open",
                note_path,
                "--vault", self.vault_name
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)
            return result.returncode == 0
        except Exception as e:
            print(f"Failed to open note: {e}")
            return False

    def search(self, query: str) -> List[str]:
        """搜索笔记"""
        try:
            cmd = [
                self.cli_path,
                "search",
                query,
                "--vault", self.vault_name
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode == 0:
                # 解析搜索结果
                lines = result.stdout.strip().split('\n')
                return [line for line in lines if line]

            return []
        except Exception as e:
            print(f"Failed to search: {e}")
            return []

    def daily_note(self) -> bool:
        """打开今日笔记"""
        try:
            cmd = [
                self.cli_path,
                "daily",
                "--vault", self.vault_name
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)
            return result.returncode == 0
        except Exception as e:
            print(f"Failed to open daily note: {e}")
            return False

    def set_frontmatter(
        self,
        note_path: str,
        key: str,
        value: str
    ) -> bool:
        """设置笔记的 frontmatter"""
        try:
            cmd = [
                self.cli_path,
                "frontmatter",
                "set",
                key,
                value,
                note_path,
                "--vault", self.vault_name
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)
            return result.returncode == 0
        except Exception as e:
            print(f"Failed to set frontmatter: {e}")
            return False
```

#### 4.2 集成到 NotebookLMManager

在 `NotebookLMManager` 中使用 `ObsidianCLI`:

```python
from lib.knowledge.obsidian_cli_wrapper import ObsidianCLI

class NotebookLMManager:
    def __init__(self, ...):
        # ... 现有代码 ...
        self.obsidian_cli = ObsidianCLI(vault_name="Knowledge-Hub")

    def _sync_artifacts_to_obsidian(self, notebook_id, artifacts):
        """使用 obsidian-cli 同步"""
        # 替换原来的文件写入为 CLI 调用
        self.obsidian_cli.create_note(
            note_path=f"03_NotebookLM/.../Study_Guide.md",
            content=artifacts['study_guide'],
            open_after=True
        )
```

---

### Phase 5: 测试和验证（Day 5-6）

#### 5.1 端到端测试

**文件**: `tests/integration/knowledge_hub_e2e_test.py`

```python
"""
Knowledge Hub v2.1 端到端测试
测试完整流程：UI → Gateway API → NotebookLM → Obsidian
"""

import pytest
import requests
from pathlib import Path

GATEWAY_URL = "http://localhost:8765"

def test_health_check():
    """测试健康检查"""
    response = requests.get(f"{GATEWAY_URL}/knowledge/v2/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "checks" in data

def test_create_notebook():
    """测试创建 notebook"""
    response = requests.post(
        f"{GATEWAY_URL}/knowledge/v2/notebook/create",
        json={"title": "E2E Test Notebook", "category": "Testing"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "notebook_id" in data
    return data["notebook_id"]

def test_upload_pdf(notebook_id: str):
    """测试上传 PDF"""
    # 创建测试 PDF
    test_pdf = Path("/tmp/test.pdf")
    # ... 创建测试 PDF ...

    with open(test_pdf, "rb") as f:
        response = requests.post(
            f"{GATEWAY_URL}/knowledge/v2/notebook/{notebook_id}/source/upload",
            files={"file": f}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "source_id" in data

def test_generate_artifacts(notebook_id: str):
    """测试生成 artifacts"""
    response = requests.post(
        f"{GATEWAY_URL}/knowledge/v2/notebook/{notebook_id}/artifacts/generate",
        json={"notebook_id": notebook_id, "sync_to_obsidian": True}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "artifacts" in data

def test_full_pipeline():
    """测试完整流水线"""
    # 1. 创建 notebook
    notebook_id = test_create_notebook()

    # 2. 上传 PDF
    test_upload_pdf(notebook_id)

    # 3. 生成 artifacts
    test_generate_artifacts(notebook_id)

    # 4. 验证 Obsidian 同步
    # ... 检查 Obsidian vault 中是否有对应文件 ...
```

#### 5.2 UI 测试

```bash
# 启动蜂巢应用
cd AionUi
npm start

# 手动测试清单:
# [ ] 能否访问 Knowledge Hub 页面
# [ ] 能否创建 Notebook
# [ ] 能否上传 PDF
# [ ] 能否查看 Study Guide
# [ ] 能否播放 Audio Overview
# [ ] 能否运行 Deep Research
# [ ] 状态监控是否正常显示
```

---

### Phase 6: 部署和文档（Day 6-7）

#### 6.1 部署清单

```bash
# 1. 确保所有依赖已安装
brew install yakitrak/yakitrak/obsidian-cli
pip install notebooklm-mcp-cli

# 2. 配置环境变量
export NOTEBOOKLM_PLAN="ultra"
export NOTEBOOKLM_MAX_SOURCES=600
export OBSIDIAN_VAULT_PATH="$HOME/Obsidian/Knowledge-Hub"

# 3. 初始化 Obsidian vault
python3 <<EOF
from lib.knowledge import NotebookLMManager
manager = NotebookLMManager()
manager.initialize_vault_structure()
EOF

# 4. 启动 Gateway
cd /Users/leo/.local/share/codex-dual
python3 -m lib.gateway.gateway_server --port 8765 &

# 5. 构建并启动蜂巢应用
cd AionUi
npm run build
npm start
```

#### 6.2 用户文档

创建 `KNOWLEDGE_HUB_USER_GUIDE.md`:

```markdown
# Knowledge Hub v2.1 用户指南

## 快速开始

1. 打开蜂巢应用
2. 点击左侧菜单 "知识中心"
3. 创建第一个 Notebook
4. 上传 PDF 文件
5. 点击 "生成学习材料"
6. 查看 Study Guide, FAQ, 听 Audio Overview

## 功能说明

### Notebook 管理
- 创建 Notebook: 组织不同主题的资料
- 上传 Sources: 支持 PDF, DOCX, TXT 等
- Ultra 账号: 每个 Notebook 最多 600 个 sources

### Artifacts 生成
- Study Guide: 结构化学习指南
- FAQ: 常见问题自动提取
- Timeline: 事件时间线
- Briefing: 执行摘要
- Audio Overview: 15分钟 AI 播客

### Deep Research
- 文献综述: 自动搜索相关文献
- 识别研究空白: 找出缺失的研究点
- 自动补全: Deep Research Agents 自动搜索

### Obsidian 集成
- 所有内容自动同步到 Obsidian
- 使用 Obsidian 进行本地编辑
- 双向链接和知识图谱

## 常见问题

Q: 如何查看 Obsidian 中的笔记?
A: 打开 Obsidian，切换到 "Knowledge-Hub" vault

Q: Audio Overview 在哪里?
A: 点击 "音频概览" 标签，可以看到所有生成的音频

Q: 如何保存 AI 对话到 Knowledge Hub?
A: 在对话页面，点击 "保存到 Knowledge Hub" 按钮
```

---

## 📊 工作量评估

| Phase | 任务 | 预计时间 | 负责人 |
|-------|------|---------|--------|
| Phase 1 | 环境准备 | 4-6 小时 | 你/Codex |
| Phase 2 | Gateway API | 1-2 天 | Codex |
| Phase 3 | UI 前端 | 2-3 天 | Codex |
| Phase 4 | Obsidian CLI | 1-2 天 | Codex |
| Phase 5 | 测试验证 | 1-2 天 | 你/Codex |
| Phase 6 | 部署文档 | 1 天 | 你/Codex |
| **总计** | | **6-10 天** | |

---

## 🎯 成功标准

### 必须达成 (P0)
- [ ] Obsidian CLI 成功安装并配置
- [ ] Gateway API 所有端点测试通过
- [ ] 蜂巢 UI 能访问 Knowledge Hub 页面
- [ ] 能成功上传 PDF 并生成 artifacts
- [ ] Obsidian 同步正常工作

### 应该达成 (P1)
- [ ] Audio Overview 生成和播放正常
- [ ] Deep Research 功能可用
- [ ] CCB 对话可保存到 NotebookLM
- [ ] 状态监控显示正确

### 可以达成 (P2)
- [ ] WebUI 美观易用
- [ ] 实时进度显示
- [ ] 错误处理完善
- [ ] 移动端适配

---

## 🚀 立即开始

### 第一步：安装 Obsidian CLI

```bash
# macOS
brew tap yakitrak/yakitrak
brew install yakitrak/yakitrak/obsidian-cli

# 验证
obsidian-cli --version

# 配置
obsidian-cli set-default --vault "Knowledge-Hub"
```

### 第二步：初始化 Vault

```bash
cd /Users/leo/.local/share/codex-dual

python3 <<EOF
from lib.knowledge import NotebookLMManager

manager = NotebookLMManager(vault_path="~/Obsidian/Knowledge-Hub")
manager.initialize_vault_structure()
print("✅ Vault initialized")
EOF
```

### 第三步：启动 Gateway（测试 API）

```bash
# 启动 Gateway
python3 -m lib.gateway.gateway_server --port 8765

# 新终端测试
curl http://localhost:8765/knowledge/v2/health
```

---

准备好开始了吗？我建议：
1. **先完成 Phase 1（环境准备）** - 最关键
2. **然后 Phase 2（Gateway API）** - 让 Codex 实现
3. **最后 Phase 3（UI）** - 最耗时，也让 Codex 实现

需要我现在开始执行 Phase 1 吗？
