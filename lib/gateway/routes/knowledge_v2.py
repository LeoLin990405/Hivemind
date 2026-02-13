"""Knowledge Hub v2/v3 Gateway API Routes.

Integrates NotebookLM Manager + Obsidian CLI + PDF pipeline + smart routing + visualization APIs.
"""
from __future__ import annotations

import asyncio
from datetime import datetime
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import uuid

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
    from lib.knowledge.smart_router import SmartNotebookRouter
    from lib.knowledge.router import KnowledgeRouter

    KNOWLEDGE_V2_AVAILABLE = True
except ImportError as exc:
    KNOWLEDGE_V2_AVAILABLE = False
    IMPORT_ERROR = str(exc)


DEFAULT_VAULT_PATH = "/Users/leo/Documents/Obsidian-Vaults/Knowledge-Hub"

if HAS_FASTAPI:
    router = APIRouter(prefix="/knowledge/v2", tags=["Knowledge Hub v2.1"])
else:
    router = None


# === Request/Response Models ===

if HAS_FASTAPI:
    class NotebookCreateRequest(BaseModel):
        title: str
        category: str = "general"
        vault_path: str = DEFAULT_VAULT_PATH


    class NotebookCreateResponse(BaseModel):
        status: str
        notebook_id: Optional[str] = None
        title: str
        category: str
        obsidian_path: Optional[str] = None
        error: Optional[str] = None


    class SourceUploadResponse(BaseModel):
        status: str
        source_id: Optional[str] = None
        notebook_id: str
        source_count: int
        rotated: bool = False
        error: Optional[str] = None


    class ArtifactsGenerateRequest(BaseModel):
        artifact_types: List[str] = Field(default=["study_guide", "faq", "timeline", "briefing", "audio"], description="Which artifacts to generate")


    class ArtifactsGenerateResponse(BaseModel):
        status: str
        notebook_id: str
        generated: List[str]
        obsidian_synced: bool
        error: Optional[str] = None


    class DeepResearchRequest(BaseModel):
        notebook_id: str
        topic: str
        max_queries: int = 10
        auto_fill: bool = True


    class DeepResearchResponse(BaseModel):
        status: str
        request_id: str
        message: str


    class PDFPipelineResponse(BaseModel):
        status: str
        notebook_id: Optional[str] = None
        artifacts: List[str]
        deep_research_id: Optional[str] = None
        obsidian_path: Optional[str] = None
        error: Optional[str] = None


    class NotebookListResponse(BaseModel):
        notebooks: List[Dict[str, Any]]
        total: int


    class SystemStatusResponse(BaseModel):
        obsidian_cli_available: bool
        obsidian_cli_version: Optional[str] = None
        vault_path: str
        notebooklm_manager_ready: bool
        total_notebooks: int


    class SmartQueryRequest(BaseModel):
        question: str
        notebook_id: Optional[str] = None
        source: str = "auto"
        use_cache: bool = True
        vault_path: str = DEFAULT_VAULT_PATH


    class SmartQueryResponse(BaseModel):
        status: str
        answer: Optional[str] = None
        source: str = "none"
        notebook_id: Optional[str] = None
        references: List[Dict[str, Any]] = Field(default_factory=list)
        confidence: float = 0.0
        cached: bool = False
        candidates: List[Dict[str, Any]] = Field(default_factory=list)
        error: Optional[str] = None


    class DashboardResponse(BaseModel):
        status: str
        snapshot_at: str
        total_notebooks: int
        total_sources: int
        near_limit_count: int
        categories: Dict[str, int]
        notebooks: List[Dict[str, Any]]
        obsidian_cli_available: bool
        notebooklm_manager_ready: bool
        error: Optional[str] = None


    class GraphResponse(BaseModel):
        status: str
        nodes: List[Dict[str, Any]]
        edges: List[Dict[str, Any]]
        error: Optional[str] = None


    class TimelineResponse(BaseModel):
        status: str
        events: List[Dict[str, Any]]
        error: Optional[str] = None


    class DataviewQueryRequest(BaseModel):
        query: str
        vault_path: str = DEFAULT_VAULT_PATH


    class DataviewQueryResponse(BaseModel):
        status: str
        query: str
        columns: List[str]
        rows: List[Dict[str, Any]]
        count: int
        executed_at: str
        error: Optional[str] = None


# === Helper Functions ===

_router_singleton: Optional[KnowledgeRouter] = None
_smart_selector = SmartNotebookRouter() if KNOWLEDGE_V2_AVAILABLE else None


def _get_manager(vault_path: str) -> NotebookLMManager:
    if not KNOWLEDGE_V2_AVAILABLE:
        raise HTTPException(status_code=503, detail=f"Knowledge Hub v2.1 not available: {IMPORT_ERROR}")
    return NotebookLMManager(vault_path=Path(vault_path))


def _get_knowledge_router() -> Optional[KnowledgeRouter]:
    global _router_singleton
    if _router_singleton is not None:
        return _router_singleton

    try:
        _router_singleton = KnowledgeRouter()
    except Exception:
        _router_singleton = None
    return _router_singleton


def _registry_notebooks(manager: NotebookLMManager) -> List[Dict[str, Any]]:
    registry = manager.registry if isinstance(manager.registry, dict) else {}
    rows: List[Dict[str, Any]] = []

    notebooks = registry.get("notebooks", {}) if isinstance(registry, dict) else {}
    if isinstance(notebooks, dict):
        for notebook_id, raw in notebooks.items():
            if not isinstance(raw, dict):
                continue
            item = dict(raw)
            item["notebook_id"] = str(item.get("notebook_id") or notebook_id)
            item["id"] = str(item.get("id") or item["notebook_id"])
            item["category"] = str(item.get("category") or "general")
            item["source_count"] = int(item.get("source_count") or 0)
            item["max_sources"] = int(item.get("max_sources") or manager.max_sources)
            item["title"] = str(item.get("title") or item["notebook_id"])
            rows.append(item)

    rows.sort(key=lambda nb: str(nb.get("created") or ""), reverse=True)
    return rows


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    candidate = str(value).strip().replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(candidate)
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(candidate, fmt)
        except ValueError:
            continue
    return None


def _build_graph_edges(notebooks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    edges: List[Dict[str, Any]] = []

    # Link notebooks in same category by created time
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for item in notebooks:
        grouped.setdefault(str(item.get("category") or "general"), []).append(item)

    for category, items in grouped.items():
        items.sort(key=lambda nb: _parse_dt(nb.get("created") or nb.get("created_at")) or datetime.min)
        for idx in range(len(items) - 1):
            source = str(items[idx].get("notebook_id") or items[idx].get("id") or "")
            target = str(items[idx + 1].get("notebook_id") or items[idx + 1].get("id") or "")
            if source and target:
                edges.append({"source": source, "target": target, "type": "category", "category": category})

    # Cross-category link by top source_count notebooks
    top = sorted(notebooks, key=lambda nb: int(nb.get("source_count") or 0), reverse=True)[:3]
    for idx in range(len(top) - 1):
        source = str(top[idx].get("notebook_id") or "")
        target = str(top[idx + 1].get("notebook_id") or "")
        if source and target:
            edges.append({"source": source, "target": target, "type": "hub"})

    return edges


def _query_notebook(manager: NotebookLMManager, notebook_id: str, question: str) -> Dict[str, Any]:
    nlm = getattr(manager, "nlm", None)
    if nlm is None:
        return {
            "answer": None,
            "source": "notebooklm",
            "notebook_id": notebook_id,
            "references": [],
            "confidence": 0.0,
            "error": "NotebookLM client is not available",
        }

    try:
        raw = nlm.query(notebook_id, question)
    except Exception as exc:
        return {
            "answer": None,
            "source": "notebooklm",
            "notebook_id": notebook_id,
            "references": [],
            "confidence": 0.0,
            "error": str(exc),
        }

    if isinstance(raw, dict):
        answer = raw.get("answer")
        return {
            "answer": answer,
            "source": "notebooklm",
            "notebook_id": notebook_id,
            "references": raw.get("references", []),
            "confidence": 0.9 if answer else 0.0,
            "error": raw.get("error"),
        }

    answer = str(raw or "")
    return {
        "answer": answer or None,
        "source": "notebooklm",
        "notebook_id": notebook_id,
        "references": [],
        "confidence": 0.9 if answer else 0.0,
    }


def _build_dataview_rows(manager: NotebookLMManager) -> List[Dict[str, Any]]:
    notebooks = _registry_notebooks(manager)
    rows: List[Dict[str, Any]] = []

    for item in notebooks:
        source_count = int(item.get("source_count") or 0)
        max_sources = max(1, int(item.get("max_sources") or manager.max_sources))
        created = str(item.get("created") or item.get("created_at") or "")
        category = str(item.get("category") or "general")
        notebook_id = str(item.get("notebook_id") or item.get("id") or "")
        title = str(item.get("title") or notebook_id)

        rows.append(
            {
                "notebook_id": notebook_id,
                "title": title,
                "category": category,
                "source_count": source_count,
                "max_sources": max_sources,
                "usage_ratio": round(source_count / max_sources, 4),
                "created": created,
                "type": "notebooklm-meta",
                "path": f"03_NotebookLM/Active_Notebooks/{title}/_notebook.json",
            }
        )

    return rows


def _extract_table_columns(query: str) -> List[str]:
    compact = " ".join(query.split())
    match = re.search(r"TABLE\s+(.+?)\s+FROM\s+", compact, re.IGNORECASE)
    if not match:
        return ["title", "category", "source_count", "created"]

    raw_expr = match.group(1)
    parts = [part.strip() for part in raw_expr.split(",") if part.strip()]
    columns: List[str] = []

    for part in parts:
        alias = re.search(r"\bAS\s+\"([^\"]+)\"", part, re.IGNORECASE)
        if alias:
            columns.append(alias.group(1))
            continue

        field_match = re.match(r"([a-zA-Z_][\w]*)", part)
        columns.append(field_match.group(1) if field_match else part)

    return columns or ["title", "category", "source_count", "created"]


def _extract_table_projection(query: str) -> List[Tuple[str, str]]:
    compact = " ".join(query.split())
    match = re.search(r"TABLE\s+(.+?)\s+FROM\s+", compact, re.IGNORECASE)
    if not match:
        return [
            ("title", "title"),
            ("category", "category"),
            ("source_count", "source_count"),
            ("created", "created"),
        ]

    raw_expr = match.group(1)
    parts = [part.strip() for part in raw_expr.split(",") if part.strip()]
    projection: List[Tuple[str, str]] = []

    for part in parts:
        alias_match = re.search(r"\bAS\s+\"([^\"]+)\"", part, re.IGNORECASE)
        source_expr = re.split(r"\bAS\b", part, maxsplit=1, flags=re.IGNORECASE)[0].strip()
        field_match = re.match(r"([a-zA-Z_][\w]*)", source_expr)
        if not field_match:
            continue

        source_field = field_match.group(1)
        alias_name = alias_match.group(1).strip() if alias_match else source_field
        projection.append((alias_name, source_field))

    if projection:
        return projection

    return [
        ("title", "title"),
        ("category", "category"),
        ("source_count", "source_count"),
        ("created", "created"),
    ]


def _apply_dataview_filters(rows: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
    filtered = rows

    where_type = re.search(r"WHERE\s+type\s*=\s*[\"']([^\"']+)[\"']", query, re.IGNORECASE)
    if where_type:
        expected = where_type.group(1).strip().lower()
        filtered = [row for row in filtered if str(row.get("type", "")).lower() == expected]

    where_category = re.search(r"WHERE\s+category\s*=\s*[\"']([^\"']+)[\"']", query, re.IGNORECASE)
    if where_category:
        expected = where_category.group(1).strip().lower()
        filtered = [row for row in filtered if str(row.get("category", "")).lower() == expected]

    where_source_gte = re.search(r"source_count\s*>=\s*(\d+)", query, re.IGNORECASE)
    if where_source_gte:
        threshold = int(where_source_gte.group(1))
        filtered = [row for row in filtered if int(row.get("source_count") or 0) >= threshold]

    where_source_lte = re.search(r"source_count\s*<=\s*(\d+)", query, re.IGNORECASE)
    if where_source_lte:
        threshold = int(where_source_lte.group(1))
        filtered = [row for row in filtered if int(row.get("source_count") or 0) <= threshold]

    return filtered


def _apply_dataview_sort_and_limit(rows: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
    sorted_rows = list(rows)

    sort_match = re.search(r"SORT\s+([a-zA-Z_][\w]*)\s*(ASC|DESC)?", query, re.IGNORECASE)
    if sort_match:
        sort_field = sort_match.group(1)
        sort_order = (sort_match.group(2) or "ASC").upper()
        reverse = sort_order == "DESC"

        def sort_key(row: Dict[str, Any]):
            value = row.get(sort_field)
            if isinstance(value, str):
                parsed = _parse_dt(value)
                if parsed is not None:
                    return parsed.timestamp()
                return value.lower()
            return value if value is not None else 0

        sorted_rows.sort(key=sort_key, reverse=reverse)

    limit_match = re.search(r"\bLIMIT\s+(\d+)\b", query, re.IGNORECASE)
    if limit_match:
        limit = max(0, int(limit_match.group(1)))
        sorted_rows = sorted_rows[:limit]

    return sorted_rows


async def _run_deep_research_background(notebook_id: str, topic: str, vault_path: str, max_queries: int = 10, auto_fill: bool = True):
    try:
        manager = _get_manager(vault_path)
        workflow = DeepResearchWorkflow(manager)
        await asyncio.to_thread(workflow.execute, notebook_id=notebook_id, topic=topic, max_queries=max_queries, auto_fill=auto_fill)
    except Exception as exc:
        print(f"Deep Research error: {exc}")


# === API Endpoints ===

if HAS_FASTAPI:

    @router.post("/notebook/create", response_model=NotebookCreateResponse)
    async def create_notebook(req: NotebookCreateRequest):
        try:
            manager = _get_manager(req.vault_path)
            metadata = manager.create_notebook_with_obsidian_sync(title=req.title, category=req.category)
            return NotebookCreateResponse(
                status="success",
                notebook_id=metadata.get("notebook_id"),
                title=req.title,
                category=req.category,
                obsidian_path=metadata.get("obsidian_path"),
            )
        except Exception as exc:
            return NotebookCreateResponse(status="error", title=req.title, category=req.category, error=str(exc))

    @router.post("/notebook/{notebook_id}/source/upload", response_model=SourceUploadResponse)
    async def upload_source(
        notebook_id: str,
        file: UploadFile = File(...),
        auto_rotate: bool = Form(True),
        vault_path: str = Form(DEFAULT_VAULT_PATH),
    ):
        try:
            manager = _get_manager(vault_path)
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(await file.read())
                tmp_path = tmp.name

            result = manager.add_pdf_with_tracking(notebook_id=notebook_id, pdf_path=Path(tmp_path), auto_rotate=auto_rotate)
            Path(tmp_path).unlink(missing_ok=True)
            return SourceUploadResponse(
                status="success",
                source_id=result.get("source_id"),
                notebook_id=notebook_id,
                source_count=result.get("source_count", 0),
                rotated=result.get("rotated", False),
            )
        except Exception as exc:
            return SourceUploadResponse(status="error", notebook_id=notebook_id, source_count=0, error=str(exc))

    @router.post("/notebook/{notebook_id}/artifacts/generate", response_model=ArtifactsGenerateResponse)
    async def generate_artifacts(notebook_id: str, req: ArtifactsGenerateRequest):
        try:
            manager = _get_manager(DEFAULT_VAULT_PATH)
            generated: List[str] = []

            for artifact_type in req.artifact_types:
                try:
                    if artifact_type == "audio":
                        workflow = AudioOverviewWorkflow(manager)
                        result = workflow.generate_audio_overview(notebook_id)
                        if result.get("success"):
                            generated.append(artifact_type)
                    else:
                        # Currently artifact generation is consolidated in manager.generate_all_artifacts
                        generated.append(artifact_type)
                except Exception:
                    continue

            # Use manager's unified sync path
            manager.generate_all_artifacts(notebook_id, sync_to_obsidian=True)

            return ArtifactsGenerateResponse(
                status="success",
                notebook_id=notebook_id,
                generated=generated,
                obsidian_synced=True,
            )
        except Exception as exc:
            return ArtifactsGenerateResponse(
                status="error",
                notebook_id=notebook_id,
                generated=[],
                obsidian_synced=False,
                error=str(exc),
            )

    @router.post("/research/literature-review", response_model=DeepResearchResponse)
    async def start_deep_research(req: DeepResearchRequest, background_tasks: BackgroundTasks):
        request_id = str(uuid.uuid4())
        background_tasks.add_task(
            _run_deep_research_background,
            notebook_id=req.notebook_id,
            topic=req.topic,
            vault_path=DEFAULT_VAULT_PATH,
            max_queries=req.max_queries,
            auto_fill=req.auto_fill,
        )
        return DeepResearchResponse(
            status="started",
            request_id=request_id,
            message=f"Deep Research started for '{req.topic}'. Track progress with request_id: {request_id}",
        )

    @router.post("/pipeline/pdf-full", response_model=PDFPipelineResponse)
    async def pdf_full_pipeline(
        file: UploadFile = File(...),
        title: str = Form(...),
        category: str = Form("research"),
        run_deep_research: bool = Form(False),
        background_tasks: BackgroundTasks = None,
    ):
        vault_path = DEFAULT_VAULT_PATH

        try:
            manager = _get_manager(vault_path)
            metadata = manager.create_notebook_with_obsidian_sync(title=title, category=category)
            notebook_id = metadata["notebook_id"]

            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(await file.read())
                tmp_path = tmp.name

            manager.add_pdf_with_tracking(notebook_id=notebook_id, pdf_path=Path(tmp_path))
            Path(tmp_path).unlink(missing_ok=True)

            manager.generate_all_artifacts(notebook_id=notebook_id, sync_to_obsidian=True)
            generated = ["study_guide", "faq", "timeline", "briefing", "audio"]

            deep_research_id = None
            if run_deep_research and background_tasks:
                deep_research_id = str(uuid.uuid4())
                background_tasks.add_task(
                    _run_deep_research_background,
                    notebook_id=notebook_id,
                    topic=title,
                    vault_path=vault_path,
                )

            return PDFPipelineResponse(
                status="success",
                notebook_id=notebook_id,
                artifacts=generated,
                deep_research_id=deep_research_id,
                obsidian_path=metadata.get("obsidian_path"),
            )
        except Exception as exc:
            return PDFPipelineResponse(status="error", artifacts=[], error=str(exc))

    @router.get("/notebook/list", response_model=NotebookListResponse)
    async def list_notebooks(vault_path: str = DEFAULT_VAULT_PATH):
        try:
            manager = _get_manager(vault_path)
            notebooks = _registry_notebooks(manager)
            return NotebookListResponse(notebooks=notebooks, total=len(notebooks))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    @router.post("/query/smart", response_model=SmartQueryResponse)
    async def smart_query(req: SmartQueryRequest):
        question = req.question.strip()
        if not question:
            return SmartQueryResponse(status="error", error="Question cannot be empty")

        try:
            manager = _get_manager(req.vault_path)
            notebooks = _registry_notebooks(manager)

            selected_notebook_id = req.notebook_id
            candidates: List[Dict[str, Any]] = []

            if not selected_notebook_id and req.source in {"auto", "notebooklm"} and _smart_selector is not None:
                route_result = _smart_selector.route(question=question, notebooks=notebooks)
                candidates = route_result.candidates
                if route_result.notebook:
                    selected_notebook_id = str(route_result.notebook.get("notebook_id") or route_result.notebook.get("id") or "")

            if req.source in {"auto", "notebooklm"} and selected_notebook_id:
                routed = _query_notebook(manager, selected_notebook_id, question)
                return SmartQueryResponse(
                    status="success" if routed.get("answer") else "error",
                    answer=routed.get("answer"),
                    source=str(routed.get("source") or "notebooklm"),
                    notebook_id=selected_notebook_id,
                    references=routed.get("references", []),
                    confidence=float(routed.get("confidence") or 0.0),
                    cached=False,
                    candidates=candidates,
                    error=routed.get("error"),
                )

            # Fallback to legacy unified router (can query Obsidian/local index)
            fallback_router = _get_knowledge_router()
            if fallback_router is not None:
                fallback = fallback_router.query(
                    question=question,
                    source=req.source,
                    notebook_id=req.notebook_id,
                    use_cache=req.use_cache,
                )
                return SmartQueryResponse(
                    status="success" if fallback.get("answer") else "error",
                    answer=fallback.get("answer"),
                    source=str(fallback.get("source") or "auto"),
                    notebook_id=fallback.get("notebook_id"),
                    references=fallback.get("references", []),
                    confidence=float(fallback.get("confidence") or 0.0),
                    cached=bool(fallback.get("cached", False)),
                    candidates=candidates,
                    error=fallback.get("error"),
                )

            return SmartQueryResponse(status="error", error="No available knowledge backend", candidates=candidates)
        except Exception as exc:
            return SmartQueryResponse(status="error", error=str(exc))

    @router.get("/analytics/dashboard", response_model=DashboardResponse)
    async def get_dashboard(vault_path: str = DEFAULT_VAULT_PATH):
        try:
            manager = _get_manager(vault_path)
            notebooks = _registry_notebooks(manager)

            categories: Dict[str, int] = {}
            total_sources = 0
            near_limit_count = 0
            rows: List[Dict[str, Any]] = []

            for item in notebooks:
                category = str(item.get("category") or "general")
                categories[category] = categories.get(category, 0) + 1

                source_count = int(item.get("source_count") or 0)
                max_sources = max(1, int(item.get("max_sources") or manager.max_sources))
                total_sources += source_count
                usage = source_count / max_sources
                if usage >= 0.8:
                    near_limit_count += 1

                rows.append(
                    {
                        "notebook_id": item.get("notebook_id"),
                        "title": item.get("title"),
                        "category": category,
                        "source_count": source_count,
                        "max_sources": max_sources,
                        "usage_ratio": round(usage, 4),
                        "created": item.get("created") or item.get("created_at"),
                    }
                )

            return DashboardResponse(
                status="success",
                snapshot_at=datetime.now().isoformat(timespec="seconds"),
                total_notebooks=len(notebooks),
                total_sources=total_sources,
                near_limit_count=near_limit_count,
                categories=categories,
                notebooks=rows,
                obsidian_cli_available=_check_obsidian_cli()[0],
                notebooklm_manager_ready=KNOWLEDGE_V2_AVAILABLE,
            )
        except Exception as exc:
            return DashboardResponse(
                status="error",
                snapshot_at=datetime.now().isoformat(timespec="seconds"),
                total_notebooks=0,
                total_sources=0,
                near_limit_count=0,
                categories={},
                notebooks=[],
                obsidian_cli_available=False,
                notebooklm_manager_ready=False,
                error=str(exc),
            )

    @router.get("/graph", response_model=GraphResponse)
    async def get_graph(vault_path: str = DEFAULT_VAULT_PATH):
        try:
            manager = _get_manager(vault_path)
            notebooks = _registry_notebooks(manager)

            nodes = [
                {
                    "id": str(nb.get("notebook_id") or nb.get("id") or ""),
                    "label": str(nb.get("title") or "Untitled"),
                    "category": str(nb.get("category") or "general"),
                    "source_count": int(nb.get("source_count") or 0),
                    "max_sources": int(nb.get("max_sources") or manager.max_sources),
                    "created": nb.get("created") or nb.get("created_at"),
                }
                for nb in notebooks
            ]

            edges = _build_graph_edges(notebooks)
            return GraphResponse(status="success", nodes=nodes, edges=edges)
        except Exception as exc:
            return GraphResponse(status="error", nodes=[], edges=[], error=str(exc))

    @router.get("/timeline", response_model=TimelineResponse)
    async def get_timeline(vault_path: str = DEFAULT_VAULT_PATH):
        try:
            manager = _get_manager(vault_path)
            notebooks = _registry_notebooks(manager)

            events: List[Tuple[datetime, Dict[str, Any]]] = []
            for item in notebooks:
                created_raw = str(item.get("created") or item.get("created_at") or "")
                created_dt = _parse_dt(created_raw) or datetime.min
                events.append(
                    (
                        created_dt,
                        {
                            "id": str(item.get("notebook_id") or item.get("id") or ""),
                            "timestamp": created_raw,
                            "type": "notebook_created",
                            "title": str(item.get("title") or "Untitled"),
                            "category": str(item.get("category") or "general"),
                            "source_count": int(item.get("source_count") or 0),
                        },
                    )
                )

            events.sort(key=lambda row: row[0], reverse=True)
            return TimelineResponse(status="success", events=[event for _, event in events])
        except Exception as exc:
            return TimelineResponse(status="error", events=[], error=str(exc))

    @router.post("/dataview/query", response_model=DataviewQueryResponse)
    async def run_dataview_query(req: DataviewQueryRequest):
        query = (req.query or "").strip()
        if not query:
            return DataviewQueryResponse(
                status="error",
                query=req.query,
                columns=[],
                rows=[],
                count=0,
                executed_at=datetime.now().isoformat(timespec="seconds"),
                error="Dataview query cannot be empty",
            )

        try:
            manager = _get_manager(req.vault_path)
            base_rows = _build_dataview_rows(manager)
            filtered_rows = _apply_dataview_filters(base_rows, query)
            final_rows = _apply_dataview_sort_and_limit(filtered_rows, query)
            projection = _extract_table_projection(query)
            columns = [alias for alias, _ in projection]

            projected_rows: List[Dict[str, Any]] = []
            for row in final_rows:
                projected_rows.append({alias: row.get(field) for alias, field in projection})

            return DataviewQueryResponse(
                status="success",
                query=query,
                columns=columns,
                rows=projected_rows,
                count=len(projected_rows),
                executed_at=datetime.now().isoformat(timespec="seconds"),
            )
        except Exception as exc:
            return DataviewQueryResponse(
                status="error",
                query=query,
                columns=[],
                rows=[],
                count=0,
                executed_at=datetime.now().isoformat(timespec="seconds"),
                error=str(exc),
            )


    @router.get("/status", response_model=SystemStatusResponse)
    async def get_system_status(vault_path: str = DEFAULT_VAULT_PATH):
        cli_available, cli_version = _check_obsidian_cli()

        manager_ready = KNOWLEDGE_V2_AVAILABLE
        total_notebooks = 0
        if manager_ready:
            try:
                manager = _get_manager(vault_path)
                total_notebooks = len(_registry_notebooks(manager))
            except Exception:
                manager_ready = False

        return SystemStatusResponse(
            obsidian_cli_available=cli_available,
            obsidian_cli_version=cli_version,
            vault_path=vault_path,
            notebooklm_manager_ready=manager_ready,
            total_notebooks=total_notebooks,
        )


def _check_obsidian_cli() -> Tuple[bool, Optional[str]]:
    cli_available = False
    cli_version: Optional[str] = None
    try:
        result = subprocess.run(["obsidian-cli", "--version"], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            cli_available = True
            cli_version = result.stdout.strip()
    except Exception:
        pass
    return cli_available, cli_version


def get_router():
    """Return the router instance."""
    return router
