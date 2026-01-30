# CCB 5.1 版本更新说明

> Phase 3 增强功能 - 性能、缓存、重试、多Provider、批量处理、Web UI

## 🎯 版本概述

CCB 5.1 引入了 6 个重要的增强功能，大幅提升系统的可靠性、可观测性和易用性。

## ✨ 新增功能

### 1. 性能分析系统 (Phase 3A)

> 📍 文件位置: `lib/performance_tracker.py`, `bin/ccb-stats`

追踪和分析每个 Provider 的性能指标：

| 指标 | 描述 |
|------|------|
| 延迟 | 响应时间（毫秒） |
| 成功率 | 成功请求百分比 |
| Token 使用量 | 输入/输出 Token 数量 |
| 请求量 | 总请求数 |

```bash
ccb stats                    # 查看所有统计
ccb stats --provider claude  # 特定 Provider
ccb stats best               # 最佳 Provider
ccb stats --export csv       # 导出数据
```

### 2. 智能缓存系统 (Phase 3B)

> 📍 文件位置: `lib/response_cache.py`, `bin/ccb-cache`

减少重复请求，提升响应速度：

- SQLite 持久化存储
- 可配置 TTL（默认 1 小时）
- 命中率追踪
- 按 Provider 标记

```bash
ccb cache stats              # 缓存统计
ccb cache list               # 列出条目
ccb cache clear              # 清空缓存
ccb ask --no-cache "问题"    # 绕过缓存
```

### 3. 自动重试机制 (Phase 3C)

> 📍 文件位置: `lib/retry_policy.py`

提升系统可靠性：

- 指数退避策略（带抖动）
- 可配置重试次数
- Provider 降级链

| 主 Provider | 降级链 |
|-------------|--------|
| claude | gemini → codex |
| gemini | claude → codex |
| codex | claude → gemini |
| deepseek | claude → gemini |
| kimi | claude → qwen |
| qwen | claude → kimi |

```bash
ccb ask --retry "问题"       # 启用重试
ccb ask --no-retry "问题"    # 禁用重试
ccb ask --max-retries 5 "问题"
```

### 4. 多 Provider 聚合 (Phase 3D)

> 📍 文件位置: `lib/multi_provider.py`

同时查询多个 Provider 并聚合结果：

| 策略 | 描述 |
|------|------|
| `all` | 显示所有结果 |
| `merge` | 合并结果 |
| `compare` | 并排比较 |
| `first_success` | 第一个成功响应 |

```bash
ccb ask "@all 最佳方案"
ccb ask --multi --providers claude,gemini,deepseek "分析"
ccb ask --multi --strategy merge "问题"
```

### 5. 批量任务处理 (Phase 3E)

> 📍 文件位置: `lib/batch_processor.py`, `bin/ccb-batch`

并行处理多个任务：

- SQLite 持久化存储
- 可控并发数
- 进度追踪
- 任务取消、清理、删除

```bash
ccb batch run -f tasks.txt   # 从文件
ccb batch run "msg1" "msg2"  # 命令行
ccb batch status <job_id>    # 检查状态
ccb batch list               # 列出任务
ccb batch cancel <job_id>    # 取消任务
ccb batch cleanup --hours 24 # 清理旧任务
ccb batch delete <job_id>    # 删除任务
```

### 6. Web 仪表盘 (Phase 3F)

> 📍 文件位置: `lib/web_server.py`, `bin/ccb-web`

实时监控和管理界面：

- 概览仪表盘
- Provider 性能图表
- 任务管理
- 缓存管理
- 健康状态检查

```bash
ccb web                      # 启动（localhost:8080）
ccb web --port 9000          # 自定义端口
ccb web --host 0.0.0.0       # 允许外部访问
```

**依赖**: `pip install fastapi uvicorn jinja2`

## 📁 新增文件

| 文件 | 描述 |
|------|------|
| `lib/performance_tracker.py` | 性能追踪系统 |
| `lib/response_cache.py` | 响应缓存系统 |
| `lib/retry_policy.py` | 重试策略 |
| `lib/multi_provider.py` | 多 Provider 执行器 |
| `lib/batch_processor.py` | 批量处理器 |
| `lib/web_server.py` | Web 服务器 |
| `bin/ccb-stats` | 性能统计 CLI |
| `bin/ccb-cache` | 缓存管理 CLI |
| `bin/ccb-batch` | 批量处理 CLI |
| `bin/ccb-web` | Web UI CLI |

## ⚙️ 配置更新

`~/.ccb_config/unified-router.yaml` 新增配置项：

```yaml
performance:
  enabled: true
  db_path: ~/.ccb_config/performance.db
  retention_days: 30

cache:
  enabled: true
  db_path: ~/.ccb_config/cache.db
  default_ttl_s: 3600

retry:
  enabled: true
  max_attempts: 3
  fallback_chains:
    claude: [gemini, codex]
    ...

multi_provider:
  enabled: true
  default_providers: [claude, gemini, codex]
  default_strategy: all

batch:
  enabled: true
  max_concurrent: 5

web:
  enabled: true
  host: 127.0.0.1
  port: 8080
```

## 🔄 v5.0 vs v5.1 对照

| 版本 | 重点特性 |
|------|----------|
| **v5.0** | 智能路由、魔法关键词、任务追踪、Context7 集成 |
| **v5.1** | 性能分析、智能缓存、自动重试、多Provider聚合、批量处理、Web UI |

## 📝 升级说明

1. 拉取最新代码：`ccb update` 或 `git pull`
2. Web UI 需要额外依赖：`pip install fastapi uvicorn jinja2`
3. 配置文件会自动使用默认值，无需手动更新
