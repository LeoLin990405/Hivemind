# CCB Gateway 全模块测试问题记录

**测试日期**: 2026-02-07
**测试场景**: React 计数器组件开发任务 - 多 AI Provider 协作测试
**测试范围**: Gateway API, State Store, Router, Memory V2, Agent System, CLI Tools

---

## Issue #1: Kimi Provider 调用触发 DeepSeek API Key 错误

**日期**: 2026-02-07
**严重程度**: **Critical** 🔴
**模块**: Gateway / Retry Executor / Fallback Chain
**测试步骤**: Phase 2.1 - Gateway 核心功能测试（同步请求）

### 问题描述

当使用 `ccb-cli kimi "用2句话解释 React Hooks"` 调用 Kimi provider 时，Gateway 返回错误：

```
错误: API key not found in environment variable: DEEPSEEK_API_KEY
```

**矛盾点**:
- 用户明确请求 Kimi provider
- Kimi 配置为 CLI backend（不需要 API key）
- 错误提示缺少 DeepSeek 的 API key
- Gateway 日志显示请求成功处理 (HTTP 200)

### 复现步骤

```bash
# 方法1: 通过 ccb-cli
cd ~/.local/share/codex-dual
ccb-cli kimi "用2句话解释 React Hooks"

# 方法2: 直接调用 Gateway API
curl -X POST 'http://localhost:8765/api/ask?wait=true&timeout=30' \
  -H "Content-Type: application/json" \
  -d '{"provider":"kimi","message":"测试：回复成功即可","timeout_s":30}'
```

**结果**:
```json
{
  "request_id": "ed2e6a1b-cf8f-4790-8dcf-a749fc253be7",
  "provider": "kimi",
  "status": "failed",
  "error": "API key not found in environment variable: DEEPSEEK_API_KEY",
  "latency_ms": 24268.97
}
```

### 预期行为

1. Gateway 路由请求到 Kimi CLIBackend
2. CLIBackend 执行 `kimi --quiet -p "用2句话解释 React Hooks"`
3. 返回 Kimi 的响应文本
4. 不应涉及任何其他 provider（如 DeepSeek）

### 实际行为

1. Gateway 接收请求 (provider=kimi)
2. 某个阶段尝试检查 DeepSeek 的 API key
3. 检查失败，返回错误
4. 整个请求失败，未获得 Kimi 响应

### 错误来源分析

**错误消息来源**: `lib/gateway/backends/http_backend.py:72`

```python
def execute(self, request: GatewayRequest) -> BackendResult:
    api_key = self._get_api_key()
    if not api_key:
        return BackendResult.fail(
            f"API key not found in environment variable: {self.config.api_key_env}",
            ...
        )
```

**问题**: 这个错误只会在 HTTPBackend 中出现，但 Kimi 配置的是 CLIBackend！

### 根本原因分析（推测）

基于以下线索：

1. **Fallback Chain 配置** (`lib/gateway/gateway_config.py:24`):
   ```python
   DEFAULT_FALLBACK_CHAINS = {
       "kimi": ["qwen", "deepseek"],
   }
   ```

2. **DeepSeek 配置** (`config/gateway.yaml:91-99`):
   ```yaml
   deepseek:
     backend_type: "http_api"
     api_key_env: "DEEPSEEK_API_KEY"
   ```

3. **RetryExecutor 逻辑** (`lib/gateway/retry.py:272-283`):
   ```python
   # Get fallback chain
   fallbacks = self.config.get_fallbacks(request.provider)

   while True:
       result = await self._execute_with_retries(request, state, execute_func)
       if result.success:
           return result, state

       # Check if we should try fallback
       if not self.config.fallback_enabled:
           break
   ```

**推测**: RetryExecutor 在 Kimi 执行失败后，尝试 fallback 到 DeepSeek，但 DeepSeek 的 HTTPBackend 初始化或执行时检查 API key 失败，导致报错。

**为什么 Kimi 会失败？**
可能原因：
1. **Kimi CLI 参数配置错误** - 已修复：添加了 `cli_args: ["--quiet", "-p"]`
2. **Kimi CLI 认证问题** - 需验证
3. **超时或其他执行错误** - 需查看详细日志

### 诊断测试结果

#### 测试1: Provider 配置验证
```python
# 运行 /tmp/test-gateway-kimi.py
```

**结果**:
- ✓ Kimi backend_type: CLI_EXEC (正确)
- ✓ Kimi api_key_env: None (正确，CLI 不需要)
- ✓ DeepSeek backend_type: HTTP_API (正确)
- ✓ DeepSeek api_key_env: DEEPSEEK_API_KEY (正确)
- ✓ Kimi CLIBackend 初始化成功
- ✓ DeepSeek HTTPBackend 初始化成功

**结论**: Backend 配置正确，初始化无问题。

#### 测试2: 直接调用 Kimi Backend
```python
request = GatewayRequest(...)
result = await kimi_backend.execute(request)
```

**结果**:
```
success: False
error: Usage: kimi [OPTIONS] COMMAND [ARGS]...
       No such command '测试：回复成功即可'.
```

**结论**:
- Kimi CLI 参数格式错误
- 原因：配置文件缺少 `-p` 参数
- 已修复：添加 `cli_args: ["--quiet", "-p"]`

但修复后问题仍存在，说明 Kimi 仍然失败，触发 fallback。

### 配置修复记录

#### 修复1: 添加 Kimi CLI 参数 ✅
**文件**: `config/gateway.yaml:127-131`

**修改前**:
```yaml
kimi:
  backend_type: "cli_exec"
  cli_command: "kimi"
```

**修改后**:
```yaml
kimi:
  backend_type: "cli_exec"
  cli_command: "kimi"
  cli_args: ["--quiet", "-p"]
```

**验证**: 重启 Gateway 后问题仍存在

### 环境状态

**Provider 认证状态** (通过 `ccb-check-auth`):
- ✓ Kimi: 正常
- ✓ Qwen: 正常
- ✓ DeepSeek: 正常
- ✗ iFlow: 未安装

**Gateway 健康检查**:
```bash
$ curl http://localhost:8765/api/health
{"status":"ok"}
```

**环境变量**:
```bash
$ echo $DEEPSEEK_API_KEY
(empty - 这是问题的直接原因)
```

### 后续调查方向

#### 优先级 P0 (立即)
1. **验证 Kimi CLI 是否正常工作**:
   ```bash
   kimi --quiet -p "测试：回复成功即可"
   ```
   检查是否返回正常响应

2. **追踪 RetryExecutor 的 fallback 逻辑**:
   - 添加详细日志查看 Kimi 失败的真实原因
   - 确认是否立即触发 fallback 到 DeepSeek

3. **检查是否 DeepSeek backend 被错误预加载**:
   - 确认 backend 初始化顺序
   - 检查是否有批量检查所有 HTTP backends 的逻辑

#### 优先级 P1 (后续)
4. **审查 fallback chain 设计合理性**:
   - CLI provider 失败时 fallback 到 HTTP provider 是否合理？
   - 是否应该区分 "配置错误" vs "执行失败"？

5. **改进错误消息**:
   - 当前错误只显示 DeepSeek API key 缺失
   - 应该显示完整 fallback chain 和每个 provider 的失败原因

### 建议修复方案

#### 方案1: 短期修复（环境变量）
```bash
# 设置 DeepSeek API key（即使不使用 DeepSeek）
export DEEPSEEK_API_KEY="dummy-key"
```

**优点**: 快速绕过问题
**缺点**: 治标不治本，隐藏真实问题

#### 方案2: 禁用 Fallback（临时）
修改 `config/gateway.yaml`:
```yaml
retry:
  fallback_enabled: false
```

**优点**: 强制使用指定 provider
**缺点**: 失去 fallback 保护

#### 方案3: 修复 Kimi CLI 执行（根本解决）
1. 确认 Kimi CLI 参数正确
2. 验证 Kimi 认证状态
3. 添加详细日志追踪执行失败原因
4. 修复 Kimi 执行逻辑

**优点**: 根本解决问题
**缺点**: 需要更多调查时间

#### 方案4: 智能 Fallback 策略
改进 RetryExecutor 逻辑：
- 区分 "配置错误"（如 API key 缺失）和 "执行失败"（如超时）
- 配置错误不应触发 fallback，应立即报错
- 只有执行失败才尝试 fallback

**优点**: 优化 fallback 逻辑，避免误导性错误
**缺点**: 需要重构 RetryExecutor

### 影响范围

**阻塞的测试阶段**:
- ❌ Phase 2: Gateway 核心功能测试
- ❌ Phase 3: 多 Provider 路由测试
- ❌ Phase 4: Agent 系统测试
- ❌ Phase 5: Memory 系统测试

**影响的功能**:
- 所有使用 Kimi provider 的请求
- 所有使用有 fallback chain 的 CLI providers
- 可能影响其他 HTTP providers（如果它们的 API keys 也未设置）

### 状态

- [x] 问题识别
- [x] 根本原因分析
- [x] 修复验证 ✅ **已修复**
- [x] 完整修复
- [x] 回归测试

### 修复方案（已实施）

**根本原因**: Gateway 加载了错误的配置文件
- 编辑的文件: `~/.local/share/codex-dual/config/gateway.yaml`
- 实际加载的文件: `~/.ccb_config/gateway.yaml`

**修复**: 在正确的配置文件中添加 Kimi CLI 参数

```yaml
# ~/.ccb_config/gateway.yaml
kimi:
  backend_type: "cli_exec"
  enabled: true
  priority: 40
  timeout_s: 300.0
  cli_command: "kimi"
  cli_args: ["--quiet", "-p"]  # 🔥 修复: 添加必需的参数
```

**验证结果**: ✅ Kimi 调用成功返回响应

---

## Issue #3: Codex CLI 缺少工作目录配置导致执行失败

**日期**: 2026-02-07
**严重程度**: **High** 🟠
**模块**: Gateway / CLIBackend / Codex Provider
**测试步骤**: Phase 3.2 - 多 Provider 路由测试（Codex 代码审查）

### 问题描述

通过 Gateway 调用 Codex provider 时返回空响应，但直接在受信任目录中执行 Codex CLI 可以正常工作。

**根本原因**: Codex CLI 要求在 "trusted directory"（受信任目录）中运行，但 Gateway 的 CLIBackend 没有配置工作目录（`cwd`），导致 subprocess 在默认目录执行时被 Codex 拒绝。

### 复现步骤

```bash
# 方法1: 通过 ccb-cli（失败）
ccb-cli codex o4-mini "审查这段代码: function add(a,b){return a+b}"
# 结果: (空响应)

# 方法2: 直接调用 Codex CLI（失败 - 非受信任目录）
codex exec "回复: 测试成功"
# 结果: Not inside a trusted directory and --skip-git-repo-check was not specified.

# 方法3: 在受信任目录中执行（成功）
cd ~/.local/share/codex-dual && codex exec "回复: 测试成功"
# 结果: 测试成功 ✅
```

### 预期行为

1. Gateway 接收 Codex 请求
2. CLIBackend 在配置的工作目录（受信任目录）中执行 `codex exec "..."`
3. Codex 正常处理请求并返回响应

### 实际行为

1. Gateway 接收 Codex 请求
2. CLIBackend 在默认目录（可能是 `/` 或 Gateway 进程的 cwd）执行
3. Codex 检测到非受信任目录，拒绝执行
4. 返回空响应（错误被吞掉）

### 技术分析

#### Codex CLI 版本信息
```
codex-cli 0.98.0
位置: /opt/homebrew/bin/codex
```

#### Codex 执行成功时的输出
```
OpenAI Codex v0.98.0 (research preview)
--------
workdir: /Users/leo/.local/share/codex-dual  # 关键：需要受信任目录
model: gpt-5.2-codex
provider: aigocode_chatgpt_plus
approval: never
sandbox: read-only
reasoning effort: xhigh
reasoning summaries: auto
session id: 019c36d1-adc5-73f3-945b-dd648b8d05b0
--------
```

#### CLIBackend 代码问题

**文件**: `lib/gateway/backends/cli_backend.py`

**问题代码** (第 399-405 行):
```python
async def _execute_with_streaming(
    self, cmd: List[str], env: dict, timeout: float, stream: StreamOutput
) -> Optional[tuple]:
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        stdin=asyncio.subprocess.DEVNULL,
        env=env,
        # ❌ 缺少 cwd 参数！
    )
```

**同样的问题存在于** (第 331-337 行):
```python
process = await asyncio.create_subprocess_exec(
    *cmd,
    stdout=asyncio.subprocess.PIPE,
    stderr=asyncio.subprocess.PIPE,
    stdin=asyncio.subprocess.DEVNULL,
    env=env,
    # ❌ 缺少 cwd 参数！
)
```

#### 配置文件缺少 cwd 支持

**文件**: `~/.ccb_config/gateway.yaml`

**当前配置**:
```yaml
codex:
  backend_type: "cli_exec"
  enabled: true
  priority: 50
  timeout_s: 300.0
  cli_command: "codex"
  cli_args: []
  # ❌ 缺少 cli_cwd 配置项
```

### 建议修复方案

#### 方案1: 添加 cli_cwd 配置支持（推荐）

**步骤 1**: 修改 `ProviderConfig` 类添加 `cli_cwd` 字段

**步骤 2**: 修改 `CLIBackend._execute_with_streaming()` 和其他执行方法，添加 `cwd` 参数：
```python
process = await asyncio.create_subprocess_exec(
    *cmd,
    stdout=asyncio.subprocess.PIPE,
    stderr=asyncio.subprocess.PIPE,
    stdin=asyncio.subprocess.DEVNULL,
    env=env,
    cwd=self.config.cli_cwd,  # 🔥 添加工作目录
)
```

**步骤 3**: 更新配置文件：
```yaml
codex:
  backend_type: "cli_exec"
  enabled: true
  priority: 50
  timeout_s: 300.0
  cli_command: "codex"
  cli_args: ["exec"]  # Codex 需要 exec 子命令
  cli_cwd: "/Users/leo/.local/share/codex-dual"  # 🔥 受信任目录
```

#### 方案2: 使用 --skip-git-repo-check 参数（临时）

```yaml
codex:
  cli_args: ["exec", "--skip-git-repo-check"]
```

**缺点**: 可能影响 Codex 的安全检查机制

#### 方案3: 设置 Gateway 进程的工作目录

启动 Gateway 时切换到受信任目录：
```bash
cd ~/.local/share/codex-dual && python3 -m lib.gateway.gateway_server --port 8765
```

**缺点**: 影响所有 provider，不够灵活

### 影响范围

**受影响的功能**:
- ❌ 所有通过 Gateway 调用 Codex 的请求
- ❌ ccb-cli codex 命令
- ❌ 代码审查任务路由到 Codex

**不受影响**:
- ✅ 直接在终端使用 `codex` 命令
- ✅ 其他 CLI providers (Kimi, Qwen, Gemini 等)

### 相关文件

| 文件 | 需要修改 | 说明 |
|------|---------|------|
| `lib/gateway/backends/cli_backend.py` | ✅ | 添加 cwd 参数到 subprocess 调用 |
| `lib/gateway/gateway_config.py` | ✅ | ProviderConfig 添加 cli_cwd 字段 |
| `~/.ccb_config/gateway.yaml` | ✅ | Codex 配置添加 cli_cwd |

### 状态

- [x] 问题识别
- [x] 根本原因分析
- [x] 修复实施 ✅ **已修复**
- [x] 验证测试 ✅
- [x] 回归测试 ✅

### 修复方案（已实施）

**Codex 实施的修复**:

1. **添加 `cli_cwd` 配置支持** (`lib/gateway/gateway_config.py`):
   ```python
   cli_cwd: Optional[str] = None
   ```

2. **CLIBackend 使用 cwd 参数** (`lib/gateway/backends/cli_backend.py`):
   ```python
   cwd = self._resolve_cwd()
   process = await asyncio.create_subprocess_exec(
       *cmd,
       cwd=cwd,  # 🔥 添加工作目录
       ...
   )
   ```

3. **配置文件更新** (`~/.ccb_config/gateway.yaml`):
   ```yaml
   codex:
     cli_args: ["exec"]
     cli_cwd: "~/.local/share/codex-dual"
   ```

**验证结果**: ✅ Codex 调用成功返回响应

---

## 问题统计

| 严重程度 | 数量 | 已修复 |
|---------|------|--------|
| Critical | 1 | 1 ✅ |
| High | 4 | 4 ✅ |
| Medium | 1 | 1 ✅ |
| Low | 0 | 0 |
| **Total** | **6** | **6** ✅ |

---

## Issue #4: OpenCode CLI 缺少 `run` 子命令和模型配置错误

**日期**: 2026-02-07
**严重程度**: **High** 🟠
**模块**: Gateway / CLIBackend / OpenCode Provider
**测试步骤**: Provider 路由测试

### 问题描述

通过 Gateway 调用 OpenCode provider 时返回空响应，存在两个问题：

1. **缺少 `run` 子命令**: OpenCode CLI 需要 `opencode run "message"` 格式，但配置中没有指定
2. **模型不存在**: 默认模型 `claude-sonnet-4-5` 在 OpenCode 中不存在

### 复现步骤

```bash
# 方法1: 通过 ccb-cli（失败）
ccb-cli opencode "Hello"
# 结果: (空响应)

# 方法2: 直接调用 OpenCode CLI（失败 - 缺少 run 子命令）
opencode "Hello"
# 结果: 启动 TUI 界面（不是我们想要的）

# 方法3: 使用 run 子命令（失败 - 模型错误）
opencode run "Hello"
# 结果: ProviderModelNotFoundError: modelID: "claude-sonnet-4-5"
```

### 错误信息

```
ProviderModelNotFoundError: ProviderModelNotFoundError
 data: {
  providerID: "opencode",
  modelID: "claude-sonnet-4-5",
  suggestions: [],
}
```

### 技术分析

#### OpenCode CLI 版本
```
opencode 1.1.53
位置: /Users/leo/.npm-global/bin/opencode
```

#### OpenCode 命令格式
```bash
# 正确格式
opencode run [message..]     # 非交互式运行

# 错误格式（当前配置）
opencode "message"           # 会启动 TUI
```

#### 当前配置问题

**文件**: `~/.ccb_config/gateway.yaml`

```yaml
opencode:
  backend_type: "cli_exec"
  enabled: true
  priority: 40
  timeout_s: 300.0
  cli_command: "opencode"
  # ❌ 缺少 cli_args: ["run"]
  # ❌ 缺少模型配置或使用了不存在的默认模型
```

### 建议修复方案

#### 步骤 1: 添加 `run` 子命令

```yaml
opencode:
  backend_type: "cli_exec"
  enabled: true
  priority: 40
  timeout_s: 300.0
  cli_command: "opencode"
  cli_args: ["run"]  # 🔥 添加 run 子命令
```

#### 步骤 2: 检查可用模型

```bash
opencode models
```

然后配置一个存在的模型。

#### 步骤 3: 可能需要配置 OpenCode 的默认模型

检查 OpenCode 配置文件（通常在 `~/.opencode/` 或 `~/.config/opencode/`）

### 影响范围

**受影响的功能**:
- ❌ 所有通过 Gateway 调用 OpenCode 的请求
- ❌ ccb-cli opencode 命令

### 状态

- [x] 问题识别
- [x] 根本原因分析
- [x] 修复实施 ✅ **已修复**
- [x] 验证测试 ✅

### 修复方案（已实施）

**Codex 实施的修复**:

1. **配置文件更新** (`~/.ccb_config/gateway.yaml`):
   ```yaml
   opencode:
     cli_args: ["run", "-m", "opencode/minimax-m2.1-free"]
   ```

**验证结果**: ✅ OpenCode 调用成功返回响应

## 测试进度

| Phase | 状态 | 完成度 |
|-------|------|--------|
| Phase 1: 环境检查 | ✅ Completed | 100% |
| Phase 2: Gateway 核心功能 | ✅ Completed | 100% (Issue #2 noted) |
| Phase 3: 多 Provider 路由 | ✅ Completed | 100% |
| Phase 4: Agent 系统 | ✅ Completed | 100% |
| Phase 5: Memory 系统 | ✅ Completed | 100% |
| Phase 6: 监控和统计 | ✅ Completed | 100% |

**Overall Progress**: 100% (6/6 phases)

### Provider 测试结果

| Provider | 状态 | 备注 |
|----------|------|------|
| Kimi | ✅ 正常 | normal + thinking 模式均可用 |
| Qwen | ✅ 正常 | |
| DeepSeek | ✅ 正常 | chat + reasoner 模式均可用 |
| Gemini | ✅ 正常 | Issue #5 已修复 - 添加 YOLO 模式 |
| iFlow | ✅ 正常 | |
| Codex | ✅ 正常 | Issue #3 已修复 - 添加 cli_cwd 支持 |
| OpenCode | ✅ 正常 | Issue #4 已修复 - 添加 run 子命令 |

---

## Issue #2: 响应缓存未生效

**日期**: 2026-02-07
**严重程度**: Medium
**模块**: Cache / Gateway API
**测试步骤**: Phase 2.3 - 缓存验证

### 问题描述

重复相同的请求时，响应没有从缓存返回，而是每次都执行真实的 Provider 调用。

### 测试步骤

```bash
# 第一次请求
ccb-cli kimi "test cache"  # 耗时 ~10秒

# 第二次请求（相同内容）
ccb-cli kimi "test cache"  # 仍然耗时 ~10秒，应该 < 1秒
```

### 预期行为

- 第一次请求：执行真实调用，保存到缓存
- 第二次请求：从缓存返回，几乎瞬间完成（< 1秒）

### 实际行为

- 两次请求都执行真实调用
- 缓存检查正常：`cached=False` (正确)
- 但是响应完成后没有保存到缓存

### Debug 日志

```
# 请求时
[DEBUG Cache] Checking cache for provider=kimi, message_hash=9045898140210985764, cached=False

# 响应完成后 - 没有"Saving to cache"日志
```

### 根本原因（待确认）

可能的原因：
1. `wait=true` 模式下的轮询机制可能绕过了缓存保存逻辑
2. `result.selected_provider` 可能为 None
3. Memory Middleware 禁用后可能影响了缓存键的计算

### 状态

✅ **已修复** - 缓存功能正常工作，验证通过

---

## Issue #5: Gemini CLI 缺少 YOLO 模式导致 Gateway 调用超时

**日期**: 2026-02-07
**严重程度**: **High** 🟠
**模块**: Gateway / CLIBackend / Gemini Provider
**测试步骤**: Provider 路由测试

### 问题描述

通过 Gateway 调用 Gemini provider 时，请求超时（90秒），但直接在终端执行 Gemini CLI 可以正常工作。

**根本原因**: Gemini CLI 默认需要用户交互确认操作，但 Gateway 的 CLIBackend 以非交互模式运行，无法响应确认提示，导致 Gemini 一直等待用户输入而超时。

### 复现步骤

```bash
# 方法1: 通过 ccb-cli（超时）
ccb-cli gemini 3f "说: 测试成功"
# 结果: 90秒后超时

# 方法2: 通过 Gateway API（超时）
curl -X POST 'http://localhost:8765/api/ask?wait=true&timeout=90' \
  -H "Content-Type: application/json" \
  -d '{"provider":"gemini","message":"说: 测试成功","timeout_s":90}'
# 结果: {"status":"timeout","error":"Request did not complete within 90.0s timeout"}

# 方法3: 直接在终端执行（成功 - 因为可以交互）
gemini -p "说: 测试成功"
# 结果: 成功返回响应（可能需要确认）
```

### 预期行为

1. Gateway 接收 Gemini 请求
2. CLIBackend 执行 `gemini -y -p "..."` (YOLO 模式自动批准)
3. Gemini 自动执行，无需等待用户确认
4. 返回响应

### 实际行为

1. Gateway 接收 Gemini 请求
2. CLIBackend 执行 `gemini -p "..."` (缺少 `-y` 参数)
3. Gemini 等待用户确认操作
4. 由于非交互模式，无法响应确认
5. 90 秒后超时

### 技术分析

#### Gemini CLI 帮助信息

```
gemini --help

  -y, --yolo                      Automatically accept all actions (aka YOLO mode)
                                  [boolean] [default: false]
  --approval-mode                 Set the approval mode:
                                  default (prompt for approval),
                                  auto_edit (auto-approve edit tools),
                                  yolo (auto-approve all tools),
                                  plan (read-only mode)
                                  [string] [choices: "default", "auto_edit", "yolo", "plan"]
```

#### 当前配置问题

**文件**: `~/.ccb_config/gateway.yaml`

```yaml
gemini:
  backend_type: "cli_exec"
  enabled: true
  priority: 50
  timeout_s: 300.0
  cli_command: "gemini"
  cli_args: ["-p"]  # ❌ 缺少 -y (YOLO 模式)
```

### 建议修复方案

#### 修复: 添加 YOLO 模式参数

**文件**: `~/.ccb_config/gateway.yaml`

```yaml
gemini:
  backend_type: "cli_exec"
  enabled: true
  priority: 50
  timeout_s: 300.0
  cli_command: "gemini"
  cli_args: ["-y", "-p"]  # 🔥 添加 -y 启用 YOLO 模式
```

**说明**:
- `-y` 或 `--yolo`: 自动批准所有操作，无需用户确认
- `-p`: 非交互模式，执行后退出

#### 可选: 使用 --approval-mode

```yaml
cli_args: ["--approval-mode", "yolo", "-p"]
```

### 影响范围

**受影响的功能**:
- ❌ 所有通过 Gateway 调用 Gemini 的请求
- ❌ ccb-cli gemini 命令
- ❌ 前端任务路由到 Gemini

**不受影响**:
- ✅ 直接在终端使用 `gemini` 命令（可交互）
- ✅ 其他 CLI providers

### 相关文件

| 文件 | 需要修改 | 说明 |
|------|---------|------|
| `~/.ccb_config/gateway.yaml` | ✅ | Gemini 配置添加 `-y` 参数 |
| `config/gateway.yaml` | ✅ | 默认配置同步更新 |

### 状态

- [x] 问题识别
- [x] 根本原因分析
- [x] 修复实施 ✅ **已修复**
- [x] 验证测试 ✅

### 修复方案（已实施）

**Codex 实施的修复**:

1. **配置文件更新** (`~/.ccb_config/gateway.yaml` 和 `config/gateway.yaml`):
   ```yaml
   gemini:
     cli_args: ["-y", "-p"]  # 🔥 添加 -y 启用 YOLO 模式
   ```

**验证结果**: ✅ Gemini 调用成功返回响应

---

## Issue #6: 同步等待模式超时率高，需要纯异步架构

**日期**: 2026-02-07
**严重程度**: **High** 🟠
**模块**: Gateway API / ccb-cli / 架构设计
**测试步骤**: 多 Provider 并发测试

### 问题描述

当前 `ccb-cli` 使用同步等待模式 (`wait=true`)，在以下场景下超时率很高：

1. **Provider 响应慢** - Codex/Gemini 可能需要 60-180 秒
2. **并发请求多** - 多个请求同时等待，Gateway CPU 飙升
3. **网络波动** - 长连接容易断开

**观察到的问题**：
- Gateway 进程 CPU 使用率达到 90%+
- 多个 curl 进程同时等待，阻塞
- 30 秒超时后请求失败，但 Provider 可能已经在处理

### 当前架构（同步等待）

```
Claude ──POST──▶ Gateway ──等待──▶ Provider
   │                │                  │
   │◀───────────────┴──────────────────┘
   │         (长时间阻塞等待)
```

**问题**：
- Claude 被阻塞，无法并行处理
- curl 超时后请求丢失
- 无法批量处理多个 Provider 响应

### 建议架构（纯异步）

```
Phase 1: 批量提交
┌─────────┐     ┌─────────┐
│ Claude  │────▶│ Gateway │──▶ 返回 request_id (立即)
│         │     │         │──▶ 入队处理
└─────────┘     └─────────┘

Phase 2: 后台执行
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Gateway │────▶│ Provider│────▶│ SQLite  │
│ (队列)  │     │  (CLI)  │     │ (结果)  │
└─────────┘     └─────────┘     └─────────┘

Phase 3: 批量读取
┌─────────┐     ┌─────────┐
│ Claude  │────▶│ Gateway │──▶ 批量返回所有完成的结果
│         │◀────│         │
└─────────┘     └─────────┘
```

### 建议修复方案

#### 1. 新增 `ccb-submit` 命令（纯异步提交）

```bash
# 批量提交，立即返回
ccb-submit kimi "问题1"      # → request_id: abc123
ccb-submit qwen "问题2"      # → request_id: def456
ccb-submit deepseek "问题3"  # → request_id: ghi789

# 不等待，继续其他工作
```

**实现**：
```bash
#!/bin/bash
# bin/ccb-submit
curl -s -X POST "http://localhost:8765/api/ask" \
  -H "Content-Type: application/json" \
  -d "{\"provider\":\"$1\",\"message\":\"$2\"}" \
  | jq -r '.request_id'
```

#### 2. 新增 `ccb-poll` 命令（批量轮询状态）

```bash
# 检查多个请求的状态
ccb-poll abc123 def456 ghi789

# 输出:
# abc123: completed ✅
# def456: processing ⏳
# ghi789: completed ✅
```

**实现**：
```bash
#!/bin/bash
# bin/ccb-poll
for id in "$@"; do
  status=$(curl -s "http://localhost:8765/api/status/$id" | jq -r '.status')
  echo "$id: $status"
done
```

#### 3. 新增 `ccb-fetch` 命令（批量获取结果）

```bash
# 获取所有已完成请求的结果
ccb-fetch abc123 ghi789

# 输出:
# === abc123 (kimi) ===
# [响应内容]
#
# === ghi789 (deepseek) ===
# [响应内容]
```

**实现**：
```bash
#!/bin/bash
# bin/ccb-fetch
for id in "$@"; do
  result=$(curl -s "http://localhost:8765/api/reply/$id")
  provider=$(echo "$result" | jq -r '.provider')
  response=$(echo "$result" | jq -r '.response')
  echo "=== $id ($provider) ==="
  echo "$response"
  echo ""
done
```

#### 4. 新增 `ccb-wait` 命令（等待所有完成）

```bash
# 等待所有请求完成，然后批量返回
ccb-wait abc123 def456 ghi789

# 轮询直到所有请求完成，然后输出所有结果
```

**实现**：
```bash
#!/bin/bash
# bin/ccb-wait
ids=("$@")
while true; do
  all_done=true
  for id in "${ids[@]}"; do
    status=$(curl -s "http://localhost:8765/api/status/$id" | jq -r '.status')
    if [ "$status" != "completed" ] && [ "$status" != "failed" ]; then
      all_done=false
      break
    fi
  done
  if $all_done; then
    break
  fi
  sleep 2
done

# 批量获取结果
for id in "${ids[@]}"; do
  ccb-fetch "$id"
done
```

### 工作流示例

```bash
# Claude 的工作流程

# 1. 批量提交（不阻塞）
ID1=$(ccb-submit kimi "分析这段代码")
ID2=$(ccb-submit qwen "优化建议")
ID3=$(ccb-submit deepseek "安全审查")

echo "已提交: $ID1, $ID2, $ID3"

# 2. 继续其他工作...
# (Claude 可以做其他事情)

# 3. 等待所有完成并获取结果
ccb-wait $ID1 $ID2 $ID3
```

### API 端点需求

| 端点 | 方法 | 功能 | 当前状态 |
|------|------|------|----------|
| `/api/ask` | POST | 提交请求（不等待） | ✅ 已有 |
| `/api/status/{id}` | GET | 查询单个请求状态 | ❓ 需确认 |
| `/api/reply/{id}` | GET | 获取单个请求结果 | ✅ 已有 |
| `/api/batch/status` | POST | 批量查询状态 | ❌ 需新增 |
| `/api/batch/reply` | POST | 批量获取结果 | ❌ 需新增 |

### 影响范围

**受影响的文件**：
- `bin/ccb-cli` - 可能需要重构或保留作为同步模式
- `bin/ccb-submit` - 新增
- `bin/ccb-poll` - 新增
- `bin/ccb-fetch` - 新增
- `bin/ccb-wait` - 新增
- `lib/gateway/gateway_api.py` - 可能需要新增批量端点

### 状态

- [x] 问题识别
- [x] 架构设计
- [x] 修复实施 ✅ **已完成**
- [x] 验证测试 ✅ **已通过**

### 修复记录

#### Issue #6.1 (已修复): Pydantic 模型作用域问题

**问题**: `/api/batch/status` 和 `/api/batch/reply` 端点返回 422 错误

```bash
curl -s -X POST 'http://localhost:8765/api/batch/status' \
  -H "Content-Type: application/json" \
  -d '{"request_ids": ["test-id"]}'

# 返回:
# {"detail":[{"type":"missing","loc":["query","batch_request"],"msg":"Field required","input":null}]}
```

**根本原因**: `BatchStatusRequest` 和 `BatchReplyRequest` 类定义在 `create_app()` 函数内部，FastAPI 无法正确解析 body 参数。

**修复**: Codex 将 Pydantic 模型移到模块顶层 (`lib/gateway/gateway_api.py:121`)

### 验证结果

| 组件 | 状态 | 测试结果 |
|------|------|----------|
| `ccb-submit` | ✅ 正常 | 立即返回 request_id |
| `ccb-poll` | ✅ 正常 | 批量查询状态 |
| `ccb-fetch` | ✅ 正常 | 批量获取结果 |
| `ccb-wait` | ✅ 正常 | 等待完成后批量返回 |
| `/api/batch/status` | ✅ 正常 | 返回正确 JSON |
| `/api/batch/reply` | ✅ 正常 | 返回正确 JSON |

### 完整工作流验证

```bash
# 1. 异步提交
ID_KIMI=$(ccb-submit kimi "1+1=?")   # → 023faa4a-...
ID_QWEN=$(ccb-submit qwen "2+2=?")   # → 42901394-...

# 2. 批量查询状态
ccb-poll "$ID_KIMI" "$ID_QWEN"
# 023faa4a-...: completed ✅
# 42901394-...: queued ⏳

# 3. 等待完成并获取结果
ccb-wait "$ID_KIMI" "$ID_QWEN"
# === 023faa4a-... (kimi) [completed] ===
# 1 + 1 = **2**
#
# === 42901394-... (qwen) [completed] ===
# 2 + 2 = 4
```

---

---

## Phase 7: 智能路由测试问题

### Issue #7: 算法路由关键词缺少中文支持

**发现时间**: 2026-02-07 下午
**严重程度**: 🟡 Medium
**状态**: ✅ 已修复（待验证）

**问题描述**:
算法相关任务（如"分析排序算法的时间复杂度"）未能正确路由到 Codex/DeepSeek。

**根本原因**:
`router.py` 中的 Algorithm 规则（第108-114行）只有英文关键词：
- algorithm, proof, math, optimize, complexity, leetcode, dynamic programming, graph

缺少中文关键词如：算法, 复杂度, 排序, 递归, 动态规划, 二分

**临时解决方案**:
使用英文查询或直接指定 provider

**建议修复**:
在 DEFAULT_ROUTING_RULES 的 Algorithm 规则中添加中文关键词

### 修复记录（已实施）

**修改内容**: 为 Algorithm 规则补充中文关键词（算法/复杂度/排序/递归/动态规划/二分/图论等）

**文件**: `lib/gateway/router.py`

**验证步骤**:
1. 重启 Gateway
2. 发送中文算法查询（如“分析排序算法的时间复杂度”）
3. 确认路由到 Codex/DeepSeek
