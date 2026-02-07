# 🏗️ CCB Gateway 架构实现详解

**日期**: 2026-02-07
**版本**: v0.24.1
**作者**: Claude Opus 4.6

---

## 📋 目录

1. [项目概述](#项目概述)
2. [核心架构](#核心架构)
3. [模块详解](#模块详解)
4. [数据流分析](#数据流分析)
5. [关键设计模式](#关键设计模式)

---

## 项目概述

### 🎯 核心价值主张

CCB Gateway 是一个**企业级多 AI 编排平台**，让 Claude 成为智能编排者，统一管理 10 个 AI Provider（Antigravity, Kimi, Qwen, DeepSeek, iFlow, Codex, Gemini, OpenCode, Qoder, Claude），配备 LLM 驱动的记忆系统、智能路由和实时监控。

### 📊 技术规模

| 指标 | 数值 |
|------|------|
| **核心代码行数** | 3,726 行 (gateway_api.py) |
| **模块数量** | 20+ 核心模块 |
| **支持 Provider** | 10 个 AI Provider |
| **数据库表** | 10+ 张表 (SQLite) |
| **API 端点** | 30+ REST + WebSocket |
| **CLI 工具** | 25+ 命令行工具 |

---

## 核心架构

### 🧩 分层架构图

```
┌──────────────────────────────────────────────────────────────────────┐
│                         用户层 (User Layer)                           │
├──────────────────────────────────────────────────────────────────────┤
│  Claude (Orchestrator)  │  CLI Tools  │  Web UI  │  HTTP Clients     │
└──────────────────────────────────────────────────────────────────────┘
                                   ↓
┌──────────────────────────────────────────────────────────────────────┐
│                      API 网关层 (API Gateway Layer)                   │
├──────────────────────────────────────────────────────────────────────┤
│  FastAPI Server (gateway_api.py)                                     │
│  - REST Endpoints (/api/ask, /api/reply, /api/status)                │
│  - WebSocket (/ws/stream)                                            │
│  - Authentication (API Keys)                                          │
│  - Rate Limiting                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                   ↓
┌──────────────────────────────────────────────────────────────────────┐
│                      业务逻辑层 (Business Logic Layer)                 │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │
│  │  Smart Router  │  │  Cache System  │  │ Memory System  │          │
│  │  (router.py)   │  │  (cache.py)    │  │ (memory_v2.py) │          │
│  └────────────────┘  └────────────────┘  └────────────────┘          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │
│  │ Request Queue  │  │  Retry Logic   │  │ Agent System   │          │
│  │ (req_queue.py) │  │  (retry.py)    │  │  (agents/*.py) │          │
│  └────────────────┘  └────────────────┘  └────────────────┘          │
└──────────────────────────────────────────────────────────────────────┘
                                   ↓
┌──────────────────────────────────────────────────────────────────────┐
│                      Provider 层 (Provider Layer)                     │
├──────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Kimi    │  │  Qwen    │  │ DeepSeek │  │  iFlow   │             │
│  │ (HTTP)   │  │ (HTTP)   │  │ (HTTP)   │  │ (HTTP)   │             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Codex   │  │  Gemini  │  │ OpenCode │  │  Qoder   │             │
│  │(WezTerm) │  │(WezTerm) │  │(WezTerm) │  │ (HTTP)   │             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐                                          │
│  │  Claude  │  │Antigravity│                                         │
│  │(WezTerm) │  │ (HTTP)   │                                          │
│  └──────────┘  └──────────┘                                          │
└──────────────────────────────────────────────────────────────────────┘
                                   ↓
┌──────────────────────────────────────────────────────────────────────┐
│                      持久化层 (Persistence Layer)                     │
├──────────────────────────────────────────────────────────────────────┤
│  SQLite Database (~/.ccb_config/gateway.db)                          │
│  - requests table (请求记录)                                          │
│  - responses table (响应记录)                                         │
│  - provider_status table (Provider 状态)                              │
│  - metrics table (性能指标)                                           │
│  - discussion_sessions/messages (讨论系统)                            │
│  - token_costs (成本追踪)                                            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 模块详解

### 1. 🚪 Gateway API (`gateway_api.py`) - 3,726 行

**职责**: HTTP/WebSocket 服务器，统一入口

#### 核心端点

| 端点 | 方法 | 功能 | 关键参数 |
|------|------|------|----------|
| `/api/ask` | POST | 提交请求 | `message`, `provider`, `timeout_s`, `agent` |
| `/api/reply` | GET | 获取结果 | `request_id` |
| `/api/status` | GET | 系统状态 | - |
| `/api/cache/stats` | GET | 缓存统计 | - |
| `/ws/stream` | WebSocket | 实时流 | - |
| `/api/discussion/start` | POST | 开始讨论 | `topic`, `providers` |
| `/api/costs/summary` | GET | 成本统计 | `days` |

#### 关键代码片段

```python
class AskRequest(BaseModel):
    """Request body for /api/ask endpoint."""
    message: str
    provider: Optional[str] = None  # 自动路由 if None
    timeout_s: float = 300.0
    priority: int = 50
    cache_bypass: bool = False
    aggregation_strategy: Optional[str] = None
    agent: Optional[str] = None  # sisyphus, oracle, reviewer
```

**设计亮点**:
- 使用 `Pydantic` 进行请求验证
- 支持同步/异步两种模式
- 内置 WebSocket 流式输出
- 统一错误处理 (`error_handlers.py`)

---

### 2. 🗄️ State Store (`state_store.py`) - 1,436 行

**职责**: SQLite 数据持久化和查询

#### 核心表结构

```sql
-- 请求表
CREATE TABLE requests (
    id TEXT PRIMARY KEY,           -- UUID
    provider TEXT NOT NULL,        -- kimi/qwen/codex/...
    message TEXT NOT NULL,         -- 用户消息
    status TEXT NOT NULL,          -- queued/processing/completed/failed
    priority INTEGER DEFAULT 50,   -- 优先级
    timeout_s REAL DEFAULT 300.0,  -- 超时设置
    created_at REAL NOT NULL,      -- 创建时间
    updated_at REAL NOT NULL,      -- 更新时间
    backend_type TEXT,             -- http/wezterm/tmux
    metadata TEXT                  -- JSON 元数据
);

-- 响应表
CREATE TABLE responses (
    request_id TEXT PRIMARY KEY,   -- 外键到 requests
    response TEXT,                 -- AI 响应内容
    error TEXT,                    -- 错误信息
    latency_ms REAL,               -- 延迟毫秒
    thinking TEXT,                 -- 思考过程
    raw_output TEXT,               -- 原始输出
    FOREIGN KEY (request_id) REFERENCES requests(id)
);

-- Provider 状态表
CREATE TABLE provider_status (
    name TEXT PRIMARY KEY,         -- Provider 名称
    backend_type TEXT NOT NULL,    -- http/wezterm
    status TEXT DEFAULT 'unknown', -- healthy/unhealthy/unknown
    avg_latency_ms REAL,           -- 平均延迟
    success_rate REAL DEFAULT 1.0, -- 成功率
    last_check REAL,               -- 最后检查时间
    enabled INTEGER DEFAULT 1      -- 是否启用
);

-- 成本追踪表
CREATE TABLE token_costs (
    provider TEXT NOT NULL,
    request_id TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_usd REAL,                 -- 美元成本
    model TEXT,
    timestamp REAL NOT NULL
);
```

#### 关键方法

```python
def create_request(self, request: GatewayRequest) -> GatewayRequest
def get_request(self, request_id: str) -> Optional[GatewayRequest]
def update_request_status(self, request_id: str, status: RequestStatus) -> bool
def save_response(self, response: GatewayResponse) -> None
def get_response(self, request_id: str) -> Optional[GatewayResponse]
def get_latest_results(self, provider: Optional[str], limit: int) -> List[Dict]
```

**设计亮点**:
- WAL 模式提升并发性能 (`PRAGMA journal_mode=WAL`)
- 索引优化查询性能 (priority, created_at, status)
- 支持老数据清理 (`cleanup_old_requests`)
- 统一结果查询 (requests + discussions)

---

### 3. 🧭 Smart Router (`router.py`) - 457 行

**职责**: 智能路由，根据任务类型选择最佳 Provider

#### 路由规则引擎

```python
@dataclass
class RoutingRule:
    keywords: List[str]        # 匹配关键词
    provider: str              # 目标 Provider
    model: Optional[str]       # 模型名称
    priority: int = 50         # 规则优先级
    description: str = ""      # 规则说明
```

#### 内置路由规则 (DEFAULT_ROUTING_RULES)

| 任务类型 | 关键词 | Provider | Model | 优先级 |
|---------|--------|----------|-------|-------|
| **前端开发** | react, vue, css, html, ui | Gemini | 3f | 80 |
| **算法推理** | algorithm, proof, math | Codex | o3 | 85 |
| **代码审查** | review, 审查, refactor | Codex | o3 | 75 |
| **图像分析** | image, screenshot, 图片 | Codex | gpt-4o | 90 |
| **长文档** | document, paper, 论文 | Kimi | - | 70 |
| **中文写作** | 翻译, 中文, 文案 | Kimi | - | 75 |
| **Python 编程** | python, script, 脚本 | Qwen | - | 60 |
| **SQL 数据库** | sql, database, mysql | Qwen | - | 70 |
| **Shell 脚本** | bash, shell, linux | Kimi | - | 60 |
| **深度推理** | 推理, reasoning, step by step | DeepSeek | reasoner | 65 |
| **快速问答** | quick, fast, 简单 | Kimi | - | 40 |
| **工作流自动化** | workflow, automation | iFlow | - | 70 |

#### 性能追踪 (ProviderPerformance)

```python
@dataclass
class ProviderPerformance:
    provider: str
    avg_latency_ms: float = 0.0     # 平均延迟
    success_rate: float = 1.0        # 成功率
    cost_per_request: float = 0.0    # 单次成本
    total_requests: int = 0          # 总请求数
    is_healthy: bool = True          # 健康状态

    def calculate_score(
        self,
        latency_weight: float = 0.3,  # 延迟权重
        success_weight: float = 0.5,  # 成功率权重
        cost_weight: float = 0.2      # 成本权重
    ) -> float:
        """计算综合性能分数 (0.0-1.0)"""
```

#### 路由决策流程

```
1. 关键词匹配 → 查找匹配的路由规则
2. 性能评估 → 获取 Provider 实时性能指标
3. 健康检查 → 过滤不健康的 Provider
4. 综合打分 → 计算 (关键词置信度 * 0.7 + 性能分数 * 0.3)
5. 选择最佳 → 返回 RoutingDecision
```

**设计亮点**:
- 关键词 + 性能双重评分机制
- 实时性能追踪和健康检查
- 支持动态添加/删除路由规则
- 自动降级到默认 Provider

---

### 4. 🧠 Memory System V2 (`memory_v2.py`) - 1,820 行

**职责**: 会话记忆管理，LLM 驱动的上下文检索

#### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│              CCB Memory System V2 Architecture               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐        │
│  │  Session   │    │  Message   │    │  Memory    │        │
│  │  管理      │    │  记录      │    │  检索      │        │
│  └────────────┘    └────────────┘    └────────────┘        │
│       ↓                  ↓                  ↓               │
│  create_session     record_message    search_memories      │
│  list_sessions      get_messages      inject_context       │
│  get_session        update_message    extract_memories     │
│                                                              │
│  ┌───────────────────────────────────────────────────┐     │
│  │  SQLite Database (~/.ccb/ccb_memory.db)           │     │
│  ├───────────────────────────────────────────────────┤     │
│  │  sessions (会话表)                                 │     │
│  │  messages (消息表)                                 │     │
│  │  memories (记忆表)                                 │     │
│  │  skills (技能使用记录)                              │     │
│  └───────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

#### 核心数据模型

```sql
-- 会话表
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,   -- UUID
    user_id TEXT NOT NULL,         -- 用户 ID (多用户隔离)
    created_at TEXT NOT NULL,      -- 创建时间
    last_active TEXT NOT NULL,     -- 最后活跃时间
    metadata TEXT                  -- JSON 元数据 (title, tags)
);

-- 消息表
CREATE TABLE messages (
    message_id TEXT PRIMARY KEY,   -- UUID
    session_id TEXT NOT NULL,      -- 所属会话
    role TEXT NOT NULL,            -- user/assistant/system
    content TEXT NOT NULL,         -- 消息内容
    provider TEXT,                 -- AI Provider
    model TEXT,                    -- 模型名称
    request_id TEXT,               -- Gateway request_id
    latency_ms INTEGER,            -- 延迟
    tokens INTEGER DEFAULT 0,      -- Token 数
    context_injected BOOLEAN,      -- 是否注入上下文
    context_count INTEGER,         -- 注入记忆数
    skills_used TEXT,              -- JSON: 使用的技能
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- 记忆表 (LLM 驱动的知识提取)
CREATE TABLE memories (
    memory_id TEXT PRIMARY KEY,    -- UUID
    session_id TEXT NOT NULL,      -- 来源会话
    content TEXT NOT NULL,         -- 记忆内容
    memory_type TEXT,              -- fact/preference/rule/pattern
    importance REAL DEFAULT 0.5,   -- 重要性 (0-1)
    embedding TEXT,                -- 向量嵌入 (JSON)
    created_at TEXT NOT NULL,
    accessed_count INTEGER DEFAULT 0,
    last_accessed TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);
```

#### 关键功能

**1. 会话管理**

```python
# 创建新会话
session_id = memory.create_session(metadata={
    "title": "前端开发讨论",
    "tags": ["react", "typescript"],
    "project": "ccb-gateway-ui"
})

# 列出最近会话
sessions = memory.list_sessions(limit=20)
```

**2. 消息记录**

```python
# 记录消息
message_id = memory.record_message(
    role="user",
    content="如何实现 React 计数器组件?",
    provider="gemini",
    model="3f",
    request_id="req-abc123",
    latency_ms=1234,
    tokens=150,
    context_injected=True,
    context_count=3,
    skills_used=["frontend-design"],
    session_id=session_id
)
```

**3. 记忆检索 (TODO: 实现 LLM 驱动的语义搜索)**

```python
# 搜索相关记忆
memories = memory.search_memories(
    query="React hooks",
    limit=5,
    session_id=session_id
)

# 注入上下文
context = memory.inject_context(
    current_message="useEffect 如何清理?",
    max_memories=5
)
```

**设计亮点**:
- Session-based 设计，天然支持多会话隔离
- 记录完整的请求链路 (request_id 关联 Gateway)
- 支持技能使用追踪 (skills_used)
- 预留 embedding 字段用于语义检索

---

### 5. ⚡ Cache System (`cache.py`) - 450 行

**职责**: 响应缓存，减少重复请求

#### 缓存策略

```python
class GatewayCache:
    def __init__(self, ttl_seconds: int = 3600):
        self._cache: Dict[str, CachedResponse] = {}
        self.ttl_seconds = ttl_seconds
        self.hits = 0
        self.misses = 0
        self.total_tokens_saved = 0
```

#### 缓存键生成

```python
def _generate_key(
    self,
    provider: str,
    message: str,
    model: Optional[str] = None
) -> str:
    """生成缓存键: sha256(provider:model:message)"""
    content = f"{provider}:{model or 'default'}:{message}"
    return hashlib.sha256(content.encode()).hexdigest()[:16]
```

#### 缓存命中率统计

```json
{
  "hits": 42,
  "misses": 158,
  "hit_rate": 0.21,
  "total_entries": 35,
  "expired_entries": 7,
  "total_tokens_saved": 125000
}
```

**设计亮点**:
- 基于消息内容的哈希键 (避免重复相同问题)
- TTL 过期机制 (默认 1 小时)
- 记录 token 节省量 (成本分析)

---

### 6. 🔄 Request Queue (`request_queue.py`) - 350 行

**职责**: 异步请求队列，优先级调度

#### 队列实现

```python
class RequestQueue:
    def __init__(self):
        self._queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
        self._pending: Dict[str, GatewayRequest] = {}
        self._processing: Set[str] = set()
```

#### 优先级调度

```python
async def enqueue(
    self,
    request: GatewayRequest,
    priority: int = 50  # 0-100, 100 = 最高优先级
) -> None:
    """入队请求"""
    # 使用负优先级实现高优先级优先出队
    await self._queue.put((-priority, time.time(), request))
    self._pending[request.id] = request
```

**设计亮点**:
- 优先级队列 (asyncio.PriorityQueue)
- 请求状态追踪 (pending/processing/completed)
- 支持批量取消 (cancel_all)

---

### 7. 🤖 Agent System (`agents/` 目录)

**职责**: AI Agent 角色系统，增强特定任务能力

#### Agent 角色定义

| Agent | 角色描述 | 系统提示 | 使用场景 |
|-------|---------|---------|---------|
| **sisyphus** 🪨 | 持续改进者 | "You are a persistent problem solver..." | Bug 修复、迭代优化 |
| **oracle** 🔮 | 预测分析师 | "You are an oracle..." | 趋势预测、风险评估 |
| **librarian** 📚 | 知识管理员 | "You are a librarian..." | 文档整理、知识库管理 |
| **explorer** 🧭 | 探索者 | "You are an explorer..." | 代码库探索、调研 |
| **frontend** 🎨 | 前端专家 | "You are a frontend expert..." | UI 组件开发 |
| **reviewer** 🔍 | 代码审查员 | "You are a code reviewer..." | 代码质量审查 |

#### Agent 注入流程

```python
# 1. CLI 指定 Agent
ccb-cli kimi -a sisyphus "修复这个 bug"

# 2. Gateway 添加系统提示
system_prompt = AGENT_PROMPTS.get(agent_role, "")
final_message = f"{system_prompt}\n\n{user_message}"

# 3. 发送到 Provider
response = await provider.send(final_message)
```

---

### 8. 🔒 Authentication & Rate Limiting

#### API Key 管理 (`auth.py`)

```python
class APIKeyManager:
    def create_key(self, name: str) -> Tuple[str, str]:
        """创建 API Key"""
        key_id = str(uuid.uuid4())[:12]
        api_key = secrets.token_urlsafe(32)
        hashed_key = hashlib.sha256(api_key.encode()).hexdigest()
        # 存储到数据库
        return key_id, api_key  # 只返回一次！
```

#### 速率限制 (`rate_limiter.py`)

```python
class RateLimiter:
    def __init__(self, rpm: int = 60):
        self.rpm = rpm  # Requests per minute
        self._requests: deque = deque()

    async def acquire(self) -> bool:
        """获取速率限制许可"""
        now = time.time()
        # 清理过期请求
        while self._requests and self._requests[0] < now - 60:
            self._requests.popleft()

        if len(self._requests) >= self.rpm:
            return False  # 超出限流

        self._requests.append(now)
        return True
```

---

## 数据流分析

### 🔄 完整请求生命周期

```
┌─────────────────────────────────────────────────────────────┐
│                    Request Lifecycle                        │
└─────────────────────────────────────────────────────────────┘

1. 用户发起请求
   ↓
   curl -X POST http://localhost:8765/api/ask \
     -H "Content-Type: application/json" \
     -d '{"message": "解释 React Hooks", "provider": "auto"}'

2. Gateway 接收 (gateway_api.py)
   ↓
   - 验证请求参数 (Pydantic 验证)
   - 检查 API Key (如果启用认证)
   - 检查速率限制 (rate_limiter)
   - 生成 request_id: req-abc123

3. 智能路由 (router.py)
   ↓
   - 分析消息: "解释 React Hooks"
   - 匹配关键词: ["react"] → 前端任务
   - 选择 Provider: gemini (3f)
   - 置信度: 0.85

4. 缓存检查 (cache.py)
   ↓
   - 生成缓存键: sha256("gemini:3f:解释 React Hooks")
   - 查找缓存: MISS (首次请求)

5. 记忆系统注入 (memory_v2.py)
   ↓
   - 搜索相关记忆: "React Hooks"
   - 找到 3 条相关记忆
   - 注入上下文到消息

6. 入队处理 (request_queue.py)
   ↓
   - 创建 GatewayRequest 对象
   - 入队: priority=50
   - 状态: queued

7. 状态持久化 (state_store.py)
   ↓
   INSERT INTO requests (id, provider, message, status, created_at, ...)
   VALUES ('req-abc123', 'gemini', '解释 React Hooks', 'queued', 1675234567.89, ...)

8. 异步处理 (gateway_server.py)
   ↓
   - Worker 线程从队列取出请求
   - 更新状态: processing
   - 调用 Provider Backend

9. Provider 执行
   ↓
   - HTTP Backend: 调用 Gemini API
   - 或 WezTerm Backend: 通过终端发送命令
   - 等待响应 (timeout: 300s)

10. 响应处理
    ↓
    - 提取响应内容
    - 计算延迟: latency_ms = 1234
    - 统计 tokens: 450

11. 保存响应 (state_store.py)
    ↓
    INSERT INTO responses (request_id, response, latency_ms, ...)
    VALUES ('req-abc123', 'React Hooks 是...', 1234, ...)

    UPDATE requests SET status='completed', completed_at=...
    WHERE id='req-abc123'

12. 缓存写入 (cache.py)
    ↓
    - 缓存响应: TTL = 3600s
    - 更新统计: misses++

13. 记录指标 (metrics.py)
    ↓
    INSERT INTO metrics (provider, event_type, latency_ms, success, ...)
    VALUES ('gemini', 'completion', 1234, 1, ...)

14. 返回响应
    ↓
    HTTP 200 OK
    {
      "request_id": "req-abc123",
      "status": "completed",
      "response": "React Hooks 是...",
      "latency_ms": 1234,
      "cached": false,
      "provider": "gemini"
    }

15. Memory 系统记录 (memory_v2.py)
    ↓
    - 记录用户消息
    - 记录 AI 响应
    - 关联 request_id
    - 提取新记忆 (TODO: LLM 驱动)
```

---

## 关键设计模式

### 1. 🎯 Strategy Pattern (路由策略)

```python
class SmartRouter:
    def route(self, message: str) -> RoutingDecision:
        # 根据关键词和性能选择最佳 Provider
        for rule in self.rules:
            if matches(rule, message):
                return RoutingDecision(provider=rule.provider)
```

### 2. 🏭 Factory Pattern (Backend 工厂)

```python
def create_backend(backend_type: BackendType, config: dict):
    if backend_type == BackendType.HTTP:
        return HTTPBackend(config)
    elif backend_type == BackendType.WEZTERM:
        return WeztermBackend(config)
```

### 3. 🎭 Proxy Pattern (Cache 代理)

```python
def ask(provider, message):
    cached = cache.get(provider, message)
    if cached:
        return cached  # 缓存命中

    response = _real_ask(provider, message)
    cache.set(provider, message, response)
    return response
```

### 4. 📊 Observer Pattern (WebSocket 事件)

```python
class WebSocketManager:
    def __init__(self):
        self._connections: List[WebSocket] = []

    async def broadcast(self, event: WebSocketEvent):
        for conn in self._connections:
            await conn.send_json(event.to_dict())
```

### 5. 🔄 Command Pattern (Request Queue)

```python
@dataclass
class GatewayRequest:
    id: str
    provider: str
    message: str
    # 请求作为命令对象，可以入队、取消、重试
```

---

## 性能优化点

### 1. 数据库优化

```sql
-- WAL 模式 (Write-Ahead Logging)
PRAGMA journal_mode=WAL;  -- 并发读写

-- 索引优化
CREATE INDEX idx_requests_priority ON requests(priority DESC, created_at ASC);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_metrics_timestamp ON metrics(timestamp);
```

### 2. 异步架构

```python
# 使用 asyncio 避免阻塞
async def process_request(request_id: str):
    request = await state_store.get_request(request_id)
    response = await provider_backend.call(request)
    await state_store.save_response(response)
```

### 3. 连接池

```python
# SQLite 连接池 (contextmanager)
@contextmanager
def _get_connection(self):
    conn = sqlite3.connect(self.db_path, timeout=30.0)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
```

---

## 监控和可观测性

### 📊 指标收集

```python
# 记录性能指标
state_store.record_metric(
    provider="gemini",
    event_type="completion",
    latency_ms=1234,
    success=True
)

# 获取聚合指标
metrics = state_store.get_provider_metrics(
    provider="gemini",
    hours=24
)
# → {total: 150, successes: 142, avg_latency: 1567ms}
```

### 📈 Web UI Dashboard

- 实时请求监控
- Provider 性能对比
- 成本统计图表
- 缓存命中率
- 错误日志查看

---

## 未来架构演进方向

### 1. 分布式部署
- 多 Gateway 实例负载均衡
- Redis 替换 SQLite 作为中心化状态存储
- 消息队列 (RabbitMQ/Kafka) 解耦请求处理

### 2. LLM 驱动的记忆系统
- 使用 Embedding 模型实现语义搜索
- 自动提取关键信息作为记忆
- 记忆重要性自动评分
- 跨会话的知识关联

### 3. 高级路由策略
- 基于模型能力的动态路由
- 成本优化路由 (选择最便宜的可用 Provider)
- A/B 测试路由 (对比不同 Provider 质量)

### 4. 增强的 Agent 系统
- Agent 协作 (多 Agent 分工完成复杂任务)
- Agent 学习 (根据用户反馈调整策略)
- Agent 权限管理 (限制某些 Agent 的操作范围)

---

## 总结

CCB Gateway 是一个**精心设计的企业级 AI 编排平台**，核心特点：

✅ **统一网关** - 一个 API 管理 10 个 AI Provider
✅ **智能路由** - 自动选择最佳 Provider
✅ **高性能** - 异步队列 + 缓存 + 连接池
✅ **可观测** - 完整的监控和指标收集
✅ **可扩展** - 模块化设计，易于添加新 Provider
✅ **企业级** - 认证、限流、成本追踪

**代码质量**: 3,726 行核心代码，清晰的分层架构，完善的错误处理，适合生产环境部署。

---

**文档作者**: Claude Opus 4.6
**更新日期**: 2026-02-07
**项目版本**: v0.24.1
