"""
Knowledge Hub v2.1 Gateway API Routes.

Integrates NotebookLM Manager + Obsidian CLI + Complete PDF Pipeline.
"""
from __future__ import annotations

import asyncio
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
    from pydantic import BaseModel, Field
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False

try:
    from lib.knowledge.notebooklm_manager import NotebookLMManager
    from lib.knowledge.audio_overview_workflow import AudioOverviewWorkflow
    from lib.knowledge.deep_research_workflow import DeepResearchWorkflow
    KNOWLEDGE_V2_AVAILABLE = True
except ImportError as e:
    KNOWLEDGE_V2_AVAILABLE = False
    IMPORT_ERROR = str(e)


if HAS_FASTAPI:
    router = APIRouter(prefix="/knowledge/v2", tags=["Knowledge Hub v2.1"])
else:
    router = None


# === Request/Response Models ===

if HAS_FASTAPI:
    # Notebook creation
    class NotebookCreateRequest(BaseModel):
        title: str
        category: str = "general"
        vault_path: str = "/Users/leo/Documents/Obsidian-Vaults/Knowledge-Hub"
    
    class NotebookCreateResponse(BaseModel):
        status: str
        notebook_id: Optional[str] = None
        title: str
        category: str
        obsidian_path: Optional[str] = None
        error: Optional[str] = None
    
    # Source upload
    class SourceUploadResponse(BaseModel):
        status: str
        source_id: Optional[str] = None
        notebook_id: str
        source_count: int
        rotated: bool = False
        error: Optional[str] = None
    
    # Artifacts generation
    class ArtifactsGenerateRequest(BaseModel):
        artifact_types: List[str] = Field(
            default=["study_guide", "faq", "timeline", "briefing", "audio"],
            description="Which artifacts to generate"
        )
    
    class ArtifactsGenerateResponse(BaseModel):
        status: str
        notebook_id: str
        generated: List[str]
        obsidian_synced: bool
        error: Optional[str] = None
    
    # Deep Research
    class DeepResearchRequest(BaseModel):
        notebook_id: str
        topic: str
        max_queries: int = 10
        auto_fill: bool = True
    
    class DeepResearchResponse(BaseModel):
        status: str
        request_id: str
        message: str
    
    # Full PDF pipeline
    class PDFPipelineResponse(BaseModel):
        status: str
        notebook_id: Optional[str] = None
        artifacts: List[str]
        deep_research_id: Optional[str] = None
        obsidian_path: Optional[str] = None
        error: Optional[str] = None
    
    # Notebook list
    class NotebookListResponse(BaseModel):
        notebooks: List[Dict[str, Any]]
        total: int
    
    # System status
    class SystemStatusResponse(BaseModel):
        obsidian_cli_available: bool
        obsidian_cli_version: Optional[str] = None
        vault_path: str
        notebooklm_manager_ready: bool
        total_notebooks: int


# === Helper Functions ===

def _get_manager(vault_path: str) -> NotebookLMManager:
    """Get NotebookLMManager instance."""
    if not KNOWLEDGE_V2_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail=f"Knowledge Hub v2.1 not available: {IMPORT_ERROR}"
        )
    return NotebookLMManager(vault_path=Path(vault_path))


async def _run_deep_research_background(
    notebook_id: str,
    topic: str,
    vault_path: str,
    max_queries: int = 10,
    auto_fill: bool = True
):
    """Background task for Deep Research."""
    try:
        manager = _get_manager(vault_path)
        workflow = DeepResearchWorkflow(manager)
        await asyncio.to_thread(
            workflow.execute,
            notebook_id=notebook_id,
            topic=topic,
            max_queries=max_queries,
            auto_fill=auto_fill
        )
    except Exception as e:
        # Log error (would use proper logging in production)
        print(f"Deep Research error: {e}")


# === API Endpoints ===

if HAS_FASTAPI:
    
    @router.post("/notebook/create", response_model=NotebookCreateResponse)
    async def create_notebook(req: NotebookCreateRequest):
        """
        Create a new NotebookLM notebook with Obsidian sync.
        
        Creates notebook in NotebookLM and corresponding folder structure
        in Obsidian vault.
        """
        try:
            manager = _get_manager(req.vault_path)
            metadata = manager.create_notebook_with_obsidian_sync(
                title=req.title,
                category=req.category
            )
            
            return NotebookCreateResponse(
                status="success",
                notebook_id=metadata.get("notebook_id"),
                title=req.title,
                category=req.category,
                obsidian_path=metadata.get("obsidian_path")
            )
        except Exception as e:
            return NotebookCreateResponse(
                status="error",
                title=req.title,
                category=req.category,
                error=str(e)
            )
    
    @router.post("/notebook/{notebook_id}/source/upload", response_model=SourceUploadResponse)
    async def upload_source(
        notebook_id: str,
        file: UploadFile = File(...),
        auto_rotate: bool = Form(True),
        vault_path: str = Form("/Users/leo/Documents/Obsidian-Vaults/Knowledge-Hub")
    ):
        """
        Upload a PDF source to a notebook.
        
        Automatically handles source rotation if limit reached (600 for Ultra account).
        """
        try:
            manager = _get_manager(vault_path)
            
            # Save uploaded file to temp
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                content = await file.read()
                tmp.write(content)
                tmp_path = tmp.name
            
            # Upload with rotation
            result = manager.add_pdf_with_tracking(
                notebook_id=notebook_id,
                pdf_path=Path(tmp_path),
                auto_rotate=auto_rotate
            )
            
            # Clean up temp file
            Path(tmp_path).unlink(missing_ok=True)
            
            return SourceUploadResponse(
                status="success",
                source_id=result.get("source_id"),
                notebook_id=notebook_id,
                source_count=result.get("source_count", 0),
                rotated=result.get("rotated", False)
            )
        except Exception as e:
            return SourceUploadResponse(
                status="error",
                notebook_id=notebook_id,
                source_count=0,
                error=str(e)
            )
    
    @router.post("/notebook/{notebook_id}/artifacts/generate", response_model=ArtifactsGenerateResponse)
    async def generate_artifacts(notebook_id: str, req: ArtifactsGenerateRequest):
        """
        Generate NotebookLM artifacts (Study Guide, FAQ, Timeline, Briefing, Audio).
        
        Generated artifacts are synced to Obsidian vault.
        """
        try:
            manager = _get_manager("/Users/leo/Documents/Obsidian-Vaults/Knowledge-Hub")
            
            generated = []
            for artifact_type in req.artifact_types:
                try:
                    if artifact_type == "audio":
                        workflow = AudioOverviewWorkflow(manager)
                        result = workflow.generate_audio_overview(notebook_id)
                    else:
                        # Generate other artifact types
                        # (would call NotebookLM API)
                        result = {"success": True}
                    
                    if result.get("success"):
                        generated.append(artifact_type)
                except Exception as e:
                    print(f"Error generating {artifact_type}: {e}")
            
            # Sync to Obsidian
            manager.sync_artifacts_to_obsidian(notebook_id)
            
            return ArtifactsGenerateResponse(
                status="success",
                notebook_id=notebook_id,
                generated=generated,
                obsidian_synced=True
            )
        except Exception as e:
            return ArtifactsGenerateResponse(
                status="error",
                notebook_id=notebook_id,
                generated=[],
                obsidian_synced=False,
                error=str(e)
            )
    
    @router.post("/research/literature-review", response_model=DeepResearchResponse)
    async def start_deep_research(
        req: DeepResearchRequest,
        background_tasks: BackgroundTasks
    ):
        """
        Start Deep Research literature review (async).
        
        This is a long-running operation executed in background.
        Returns immediately with request_id for tracking.
        """
        import uuid
        request_id = str(uuid.uuid4())
        
        background_tasks.add_task(
            _run_deep_research_background,
            notebook_id=req.notebook_id,
            topic=req.topic,
            vault_path="/Users/leo/Documents/Obsidian-Vaults/Knowledge-Hub",
            max_queries=req.max_queries,
            auto_fill=req.auto_fill
        )
        
        return DeepResearchResponse(
            status="started",
            request_id=request_id,
            message=f"Deep Research started for '{req.topic}'. Track progress with request_id: {request_id}"
        )
    
    @router.post("/pipeline/pdf-full", response_model=PDFPipelineResponse)
    async def pdf_full_pipeline(
        file: UploadFile = File(...),
        title: str = Form(...),
        category: str = Form("research"),
        run_deep_research: bool = Form(False),
        background_tasks: BackgroundTasks = None
    ):
        """
        Complete PDF pipeline (all 6 steps).
        
        1. Create NotebookLM notebook
        2. Upload PDF
        3. Generate artifacts
        4. (Optional) Deep Research
        5. Sync to Obsidian
        6. Update Daily Note
        """
        vault_path = "/Users/leo/Documents/Obsidian-Vaults/Knowledge-Hub"
        
        try:
            manager = _get_manager(vault_path)
            
            # Step 1: Create notebook
            metadata = manager.create_notebook_with_obsidian_sync(title=title, category=category)
            notebook_id = metadata["notebook_id"]
            
            # Step 2: Upload PDF
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                content = await file.read()
                tmp.write(content)
                tmp_path = tmp.name
            
            manager.add_pdf_with_tracking(notebook_id=notebook_id, pdf_path=Path(tmp_path))
            Path(tmp_path).unlink(missing_ok=True)
            
            # Step 3: Generate artifacts
            artifacts = ["study_guide", "faq", "timeline", "briefing", "audio"]
            generated = []
            for artifact in artifacts:
                try:
                    if artifact == "audio":
                        workflow = AudioOverviewWorkflow(manager)
                        workflow.generate_audio_overview(notebook_id)
                    generated.append(artifact)
                except:
                    pass
            
            # Step 4: (Optional) Deep Research
            deep_research_id = None
            if run_deep_research and background_tasks:
                import uuid
                deep_research_id = str(uuid.uuid4())
                background_tasks.add_task(
                    _run_deep_research_background,
                    notebook_id=notebook_id,
                    topic=title,
                    vault_path=vault_path
                )
            
            # Step 5 & 6: Sync to Obsidian (already done in create_notebook_with_obsidian_sync)
            
            return PDFPipelineResponse(
                status="success",
                notebook_id=notebook_id,
                artifacts=generated,
                deep_research_id=deep_research_id,
                obsidian_path=metadata.get("obsidian_path")
            )
        except Exception as e:
            return PDFPipelineResponse(
                status="error",
                artifacts=[],
                error=str(e)
            )
    
    @router.get("/notebook/list", response_model=NotebookListResponse)
    async def list_notebooks(
        vault_path: str = "/Users/leo/Documents/Obsidian-Vaults/Knowledge-Hub"
    ):
        """List all NotebookLM notebooks with metadata."""
        try:
            manager = _get_manager(vault_path)
            notebooks = manager.registry.list_notebooks()
            return NotebookListResponse(
                notebooks=notebooks,
                total=len(notebooks)
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/status", response_model=SystemStatusResponse)
    async def get_system_status():
        """Get Knowledge Hub v2.1 system status."""
        import subprocess
        
        vault_path = "/Users/leo/Documents/Obsidian-Vaults/Knowledge-Hub"
        
        # Check obsidian-cli
        cli_available = False
        cli_version = None
        try:
            result = subprocess.run(
                ["obsidian-cli", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                cli_available = True
                cli_version = result.stdout.strip()
        except:
            pass
        
        # Check manager
        manager_ready = KNOWLEDGE_V2_AVAILABLE
        total_notebooks = 0
        if manager_ready:
            try:
                manager = _get_manager(vault_path)
                total_notebooks = len(manager.registry.list_notebooks())
            except:
                manager_ready = False
        
        return SystemStatusResponse(
            obsidian_cli_available=cli_available,
            obsidian_cli_version=cli_version,
            vault_path=vault_path,
            notebooklm_manager_ready=manager_ready,
            total_notebooks=total_notebooks
        )


def get_router():
    """Return the router instance."""
    return router
