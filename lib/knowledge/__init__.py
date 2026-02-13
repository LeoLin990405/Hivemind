"""Knowledge Hub package."""

from .index_manager import IndexManager
from .notebooklm_client import NotebookLMClient
from .obsidian_search import ObsidianSearch
from .router import KnowledgeRouter
from .notebooklm_manager import NotebookLMManager
from .audio_overview_workflow import AudioOverviewWorkflow
from .deep_research_workflow import DeepResearchWorkflow
from .smart_router import SmartNotebookRouter
from .source_manager import NotebookLMSourceManager
from .shared_knowledge import SharedKnowledgeService

__all__ = [
    "KnowledgeRouter",
    "NotebookLMClient",
    "ObsidianSearch",
    "IndexManager",
    "SharedKnowledgeService",
    "NotebookLMManager",
    "AudioOverviewWorkflow",
    "DeepResearchWorkflow",
    "SmartNotebookRouter",
    "NotebookLMSourceManager",
]

__version__ = "0.1.0"
