# Codex 任务：蜂巢 UI 全面更新计划

**工作目录**: `/Users/leo/.local/share/codex-dual/HiveMindUI`
**执行时间**: 2026-02-12
**优先级**: P0 (高优先级)

---

## 任务概览

1. ✨ **完全更新 UI 设计** - 现代化、统一风格
2. 🔧 **Provider 调整** - 移除 Droid，添加 iFlow 和 Ollama
3. 🐛 **修复 Gemini CLI 弹出问题** - 阻止不必要的窗口弹出

---

## 📋 执行前准备

### 0.1 环境检查
```bash
cd /Users/leo/.local/share/codex-dual/HiveMindUI

# 确保应用未运行
pkill -f "Electron" 2>/dev/null || echo "✓ 无运行中的 Electron 进程"

# 备份当前状态
git stash
git checkout -b ui-update-$(date +%Y%m%d)
git stash pop

echo "✓ 准备完成"
```

### 0.2 依赖确认
```bash
# 确认 Arco Design 版本
npm ls @arco-design/web-react

# 确认 UnoCSS 可用
npm ls unocss

echo "✓ 依赖检查完成"
```

---

## 任务 1: 完全更新 UI 设计 🎨

### 1.1 设计系统调研

**第一步：分析当前 UI 问题**
```bash
# 查看当前主题配置
cat src/renderer/components/CssThemeSettings/presets.ts | head -50

# 查看当前颜色定义
grep -r "color:" src/renderer/theme/ | head -20

# 查看当前使用的组件
find src/renderer -name "*.tsx" -exec grep -l "import.*@arco-design" {} \; | wc -l
```

**记录当前 UI 特征**:
- 主色调
- 组件样式
- 间距规范
- 圆角半径
- 阴影效果

### 1.2 新 UI 设计规范

**创建设计系统文件**: `src/renderer/design-system.ts`

```typescript
// 新的设计系统规范
export const DesignTokens = {
  // 颜色系统
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',  // 主色
      600: '#2563eb',
      700: '#1d4ed8',
      900: '#1e3a8a',
    },
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },

  // 间距系统 (8px 基准)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },

  // 圆角
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  // 阴影
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },

  // 字体
  typography: {
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },

  // 动画
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export type DesignTokens = typeof DesignTokens;
```

**创建文件**:
```bash
cat > src/renderer/design-system.ts << 'EOF'
// (将上面的内容粘贴到这里)
EOF
```

### 1.3 更新全局样式

**文件**: `src/renderer/theme/global.css` (如果不存在则创建)

```css
/* 全局 CSS 变量 */
:root {
  /* 颜色 */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* 间距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* 阴影 */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);

  /* 动画 */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 暗色模式 */
.dark {
  --color-bg: #111827;
  --color-text: #f9fafb;
  --color-border: #374151;
}

/* 重置默认样式 */
* {
  box-sizing: border-box;
}

/* 平滑滚动 */
html {
  scroll-behavior: smooth;
}

/* 去除默认间距 */
body, h1, h2, h3, h4, h5, h6, p {
  margin: 0;
  padding: 0;
}

/* 默认字体 */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
               "Helvetica Neue", Arial, sans-serif;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
```

**创建/更新文件**:
```bash
mkdir -p src/renderer/theme
cat > src/renderer/theme/global.css << 'EOF'
// (将上面的内容粘贴)
EOF

# 在入口文件引入
# 找到 src/renderer/index.ts 或 index.tsx，添加:
# import './theme/global.css';
```

### 1.4 更新 Arco Design 主题

**文件**: `src/renderer/theme/arco-theme.ts` (创建)

```typescript
import { ConfigProvider } from '@arco-design/web-react';
import { DesignTokens } from '../design-system';

export const arcoThemeConfig = {
  componentConfig: {
    Button: {
      style: {
        borderRadius: DesignTokens.radius.md,
        transition: DesignTokens.transitions.base,
      },
    },
    Card: {
      style: {
        borderRadius: DesignTokens.radius.lg,
        boxShadow: DesignTokens.shadows.md,
      },
    },
    Input: {
      style: {
        borderRadius: DesignTokens.radius.md,
      },
    },
    Modal: {
      style: {
        borderRadius: DesignTokens.radius.xl,
      },
    },
  },
};
```

### 1.5 重点组件更新清单

**需要更新的核心组件**:

```bash
# 1. 聊天界面
src/renderer/pages/conversation/index.tsx
src/renderer/pages/conversation/components/MessageList.tsx
src/renderer/pages/conversation/components/InputBox.tsx

# 2. 侧边栏
src/renderer/components/Sidebar/index.tsx
src/renderer/components/Sidebar/ConversationList.tsx

# 3. 设置面板
src/renderer/components/SettingsModal/index.tsx
src/renderer/components/SettingsModal/contents/*.tsx

# 4. 监控面板
src/renderer/pages/monitor/Dashboard.tsx
src/renderer/pages/monitor/CacheManager.tsx
src/renderer/pages/monitor/TaskQueue.tsx

# 5. Provider 选择器
src/renderer/pages/conversation/hivemind/HivemindSendBox.tsx
src/renderer/pages/conversation/hivemind/HivemindProviderBadge.tsx
```

**更新策略**（每个组件）:
1. 移除硬编码的样式值
2. 使用 `DesignTokens` 中的变量
3. 统一间距、圆角、阴影
4. 优化动画效果
5. 改进暗色模式支持

**示例更新** (`MessageList.tsx`):
```typescript
// 之前
<div style={{ padding: '12px', borderRadius: '8px' }}>

// 之后
import { DesignTokens } from '@/design-system';

<div style={{
  padding: DesignTokens.spacing.md,
  borderRadius: DesignTokens.radius.lg,
  boxShadow: DesignTokens.shadows.sm,
  transition: DesignTokens.transitions.base,
}}>
```

### 1.6 执行 UI 更新

**自动化脚本**: `scripts/update-ui-styles.sh`

```bash
#!/bin/bash
# 批量更新组件样式

echo "=== 开始 UI 更新 ==="

# 1. 创建设计系统文件
echo "✓ 创建设计系统文件"
# (已在 1.2 步骤完成)

# 2. 创建全局样式
echo "✓ 创建全局样式"
# (已在 1.3 步骤完成)

# 3. 在入口文件引入全局样式
echo "✓ 引入全局样式"
if ! grep -q "theme/global.css" src/renderer/index.tsx; then
  sed -i '' "1i\\
import './theme/global.css';\\
" src/renderer/index.tsx
fi

# 4. 查找需要更新的组件
echo "=== 需要更新的组件 ==="
find src/renderer -name "*.tsx" \
  -exec grep -l "style={{" {} \; \
  | head -20

echo -e "\n✓ UI 更新准备完成"
echo "请手动更新上述组件的样式"
```

**执行脚本**:
```bash
chmod +x scripts/update-ui-styles.sh
./scripts/update-ui-styles.sh
```

### 1.7 验证 UI 更新

```bash
# 启动应用查看效果
npm start

# 检查是否有样式错误
# 打开 DevTools (Cmd+Option+I)
# 查看 Console 是否有 CSS 警告
```

**验证清单**:
- [ ] 颜色统一使用设计系统
- [ ] 间距统一 (8px 基准)
- [ ] 圆角统一
- [ ] 阴影效果统一
- [ ] 动画流畅
- [ ] 暗色模式正常

---

## 任务 2: Provider 调整（移除 Droid，添加 iFlow 和 Ollama）🔧

### 2.1 搜索 Droid 引用

```bash
echo "=== 搜索 Droid 相关代码 ==="

# 搜索文件名
find src -iname "*droid*" -type f

# 搜索代码引用
grep -r "droid\|Droid\|DROID" src/ \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.json" \
  | grep -v "node_modules" \
  | tee droid-references.txt

echo "✓ 搜索结果已保存到 droid-references.txt"
```

### 2.2 移除 Droid 相关代码

**预期需要修改的文件**:

1. **配置文件**: `src/renderer/config/modelPlatforms.ts`
```typescript
// 查找并删除
export const PLATFORMS = [
  // ... 其他平台
  // { id: 'droid', name: 'Droid', ... },  // ← 删除这行
];
```

2. **类型定义**: `src/common/types.ts` 或类似文件
```typescript
// 删除 Droid 相关类型
// type Provider = 'claude' | 'gemini' | 'codex' | 'droid' | ...;
// 改为:
type Provider = 'claude' | 'gemini' | 'codex' | 'iflow' | 'ollama' | ...;
```

3. **Agent 实现**: `src/agent/droid/*` (如果存在)
```bash
# 删除整个 droid 目录
rm -rf src/agent/droid/
```

4. **i18n 翻译**: `src/renderer/i18n/locales/*.json`
```bash
# 批量删除 Droid 相关翻译
for file in src/renderer/i18n/locales/*.json; do
  # 使用 jq 删除 droid 相关 key (如果有)
  echo "处理: $file"
done
```

**执行删除**:
```bash
# 1. 备份当前状态
git add -A
git commit -m "chore: backup before removing Droid"

# 2. 删除 Droid agent 目录（如果存在）
if [ -d "src/agent/droid" ]; then
  git rm -rf src/agent/droid/
  echo "✓ 已删除 src/agent/droid/"
fi

# 3. 删除 Droid worker（如果存在）
if [ -f "src/worker/droid.ts" ]; then
  git rm src/worker/droid.ts
  echo "✓ 已删除 src/worker/droid.ts"
fi

# 4. 从 package.json 移除相关依赖
# (手动检查是否有 droid 相关依赖)
```

### 2.3 添加 iFlow 支持

**第一步：创建 iFlow agent**

**文件**: `src/agent/iflow/index.ts`

```typescript
/**
 * iFlow Agent Implementation
 * iFlow 是一个工作流自动化 AI
 */

import { BaseAgent } from '../base/BaseAgent';

export class IflowAgent extends BaseAgent {
  constructor() {
    super({
      id: 'iflow',
      name: 'iFlow',
      description: '工作流自动化 AI',
      capabilities: ['workflow', 'automation', 'task-planning'],
    });
  }

  async sendMessage(message: string): Promise<string> {
    // TODO: 实现 iFlow API 调用
    // 根据 Hivemind Gateway 的 iFlow provider 实现
    const response = await this.callHivemindGateway('iflow', message);
    return response;
  }

  private async callHivemindGateway(provider: string, message: string) {
    const gatewayUrl = 'http://localhost:8765';
    const response = await fetch(`${gatewayUrl}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, message }),
    });
    const data = await response.json();
    return data.response;
  }
}

export default IflowAgent;
```

**创建文件**:
```bash
mkdir -p src/agent/iflow
cat > src/agent/iflow/index.ts << 'EOF'
// (粘贴上面的代码)
EOF
```

**第二步：在配置中注册 iFlow**

**文件**: `src/renderer/config/modelPlatforms.ts`

```typescript
export const PLATFORMS = [
  // ... 现有平台
  {
    id: 'iflow',
    name: 'iFlow',
    icon: '🔄', // 或使用实际图标
    description: '工作流自动化 AI',
    models: ['iflow-thinking', 'iflow-normal'],
    capabilities: ['chat', 'workflow', 'automation'],
    speedTier: 'medium', // ⚡ 中速
  },
];
```

**第三步：添加 i18n 翻译**

**文件**: `src/renderer/i18n/locales/zh-CN.json`

```json
{
  "providers": {
    "iflow": {
      "name": "iFlow",
      "description": "工作流自动化 AI",
      "thinking": "思考链模式",
      "normal": "普通模式"
    }
  }
}
```

### 2.4 添加 Ollama 支持

**第一步：创建 Ollama agent**

**文件**: `src/agent/ollama/index.ts`

```typescript
/**
 * Ollama Agent Implementation
 * Ollama 是本地 LLM 运行时
 */

import { BaseAgent } from '../base/BaseAgent';

export class OllamaAgent extends BaseAgent {
  constructor() {
    super({
      id: 'ollama',
      name: 'Ollama',
      description: '本地大语言模型',
      capabilities: ['chat', 'local', 'offline'],
    });
  }

  async sendMessage(message: string, model?: string): Promise<string> {
    // Ollama 默认运行在 localhost:11434
    const ollamaUrl = 'http://localhost:11434';
    const selectedModel = model || 'llama3.2'; // 默认模型

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: selectedModel,
        prompt: message,
        stream: false,
      }),
    });

    const data = await response.json();
    return data.response;
  }

  async listModels(): Promise<string[]> {
    const ollamaUrl = 'http://localhost:11434';
    const response = await fetch(`${ollamaUrl}/api/tags`);
    const data = await response.json();
    return data.models.map((m: any) => m.name);
  }
}

export default OllamaAgent;
```

**创建文件**:
```bash
mkdir -p src/agent/ollama
cat > src/agent/ollama/index.ts << 'EOF'
// (粘贴上面的代码)
EOF
```

**第二步：在配置中注册 Ollama**

**文件**: `src/renderer/config/modelPlatforms.ts`

```typescript
export const PLATFORMS = [
  // ... 现有平台
  {
    id: 'ollama',
    name: 'Ollama',
    icon: '🦙', // Llama 图标
    description: '本地大语言模型',
    models: [], // 动态加载
    capabilities: ['chat', 'local', 'offline', 'privacy'],
    speedTier: 'fast', // 🚀 快速 (本地运行)
    endpoint: 'http://localhost:11434',
  },
];
```

**第三步：添加 i18n 翻译**

**文件**: `src/renderer/i18n/locales/zh-CN.json`

```json
{
  "providers": {
    "ollama": {
      "name": "Ollama",
      "description": "本地大语言模型",
      "offline": "离线可用",
      "local": "本地运行",
      "privacy": "隐私保护",
      "noModels": "未检测到模型，请先运行 ollama pull <model-name>",
      "connectionError": "无法连接到 Ollama (localhost:11434)"
    }
  }
}
```

### 2.5 更新 Provider 列表 UI

**文件**: `src/renderer/pages/conversation/hivemind/HivemindSendBox.tsx`

查找 Provider 选择器部分，确保包含 iFlow 和 Ollama，移除 Droid：

```typescript
const PROVIDERS = [
  { id: 'kimi', name: 'Kimi', tier: 'fast' },
  { id: 'qwen', name: 'Qwen', tier: 'fast' },
  { id: 'deepseek', name: 'DeepSeek', tier: 'medium' },
  { id: 'iflow', name: 'iFlow', tier: 'medium' },    // ← 新增
  { id: 'ollama', name: 'Ollama', tier: 'fast' },    // ← 新增
  { id: 'codex', name: 'Codex', tier: 'slow' },
  { id: 'gemini', name: 'Gemini', tier: 'slow' },
  // { id: 'droid', name: 'Droid', tier: 'medium' }, // ← 删除
];
```

### 2.6 验证 Provider 更新

```bash
# 启动应用
npm start

# 验证清单:
# - [ ] Provider 选择器中看不到 Droid
# - [ ] Provider 选择器中可以看到 iFlow
# - [ ] Provider 选择器中可以看到 Ollama
# - [ ] 选择 iFlow 可以正常发送消息
# - [ ] 选择 Ollama 可以正常发送消息（需要先启动 Ollama）
```

**测试 Ollama 连接**:
```bash
# 确保 Ollama 在运行
curl http://localhost:11434/api/tags

# 如果未安装，提示用户安装
echo "如果 Ollama 未安装，请访问: https://ollama.ai"
```

---

## 任务 3: 修复 Gemini CLI 自动弹出界面问题 🐛

### 3.1 定位问题

**搜索 Gemini 相关窗口创建代码**:
```bash
echo "=== 搜索 Gemini 窗口/弹出相关代码 ==="

# 搜索 BrowserWindow 创建
grep -rn "new BrowserWindow" src/agent/gemini/ src/process/ \
  | grep -i "gemini"

# 搜索 window.open
grep -rn "window\.open\|showModal\|dialog\.show" src/agent/gemini/ \
  | tee gemini-popup-refs.txt

# 搜索 OAuth 相关代码（常见弹出原因）
grep -rn "oauth\|OAuth\|authorize" src/agent/gemini/ \
  | tee gemini-oauth-refs.txt

echo "✓ 搜索结果已保存"
```

### 3.2 分析弹出原因

**常见弹出场景**:
1. **OAuth 认证** - 打开浏览器进行授权
2. **错误提示** - 显示错误对话框
3. **DevTools** - 自动打开开发者工具
4. **外部链接** - 点击链接打开新窗口

**检查 OAuth 流程**:
```bash
# 查看 Gemini OAuth 配置
cat src/agent/gemini/cli/oauthTokenManager.ts | head -100

# 查看是否有自动打开浏览器的代码
grep -n "open.*http\|exec.*open\|shell\.openExternal" \
  src/agent/gemini/
```

### 3.3 解决方案 1: 禁止自动打开浏览器

**文件**: `src/agent/gemini/cli/oauthTokenManager.ts` (或类似文件)

**查找类似代码**:
```typescript
// 问题代码 (自动打开浏览器)
const open = require('open');
await open(authUrl); // ← 这会弹出浏览器

// 或者
const { shell } = require('electron');
shell.openExternal(authUrl); // ← 这也会弹出
```

**修改为**:
```typescript
// 解决方案：不自动打开，而是显示链接让用户手动复制
console.log('请在浏览器中打开以下链接进行授权:');
console.log(authUrl);

// 或者复制到剪贴板
const { clipboard } = require('electron');
clipboard.writeText(authUrl);
console.log('授权链接已复制到剪贴板');
```

**具体修改步骤**:
```bash
# 1. 找到 OAuth 相关文件
OAUTH_FILE=$(find src/agent/gemini -name "*oauth*" -o -name "*auth*" | head -1)

if [ -f "$OAUTH_FILE" ]; then
  echo "找到 OAuth 文件: $OAUTH_FILE"

  # 2. 备份
  cp "$OAUTH_FILE" "${OAUTH_FILE}.backup"

  # 3. 查看是否有 shell.openExternal 或 open() 调用
  grep -n "shell\.openExternal\|require.*open\|import.*open" "$OAUTH_FILE"

  # 4. 手动编辑该文件，注释掉自动打开的代码
  echo "请手动编辑 $OAUTH_FILE，注释掉自动打开浏览器的代码"
fi
```

### 3.4 解决方案 2: 使用静默认证

**文件**: `src/agent/gemini/cli/config.ts`

```typescript
// 添加静默认证配置
export const GEMINI_CONFIG = {
  // ... 其他配置
  auth: {
    silent: true,              // 静默认证
    useStoredToken: true,      // 优先使用存储的 token
    autoRefresh: true,         // 自动刷新 token
    skipBrowserAuth: true,     // 跳过浏览器认证
  },
};
```

### 3.5 解决方案 3: 拦截窗口创建

**文件**: `src/index.ts` (主进程入口)

```typescript
import { app, BrowserWindow } from 'electron';

// 在 app.ready 之前添加
app.on('web-contents-created', (event, contents) => {
  // 拦截新窗口创建
  contents.setWindowOpenHandler((details) => {
    const url = details.url;

    // 如果是 Gemini OAuth 相关链接
    if (url.includes('accounts.google.com') || url.includes('oauth')) {
      console.log('拦截 Gemini OAuth 窗口:', url);

      // 复制链接到剪贴板
      const { clipboard } = require('electron');
      clipboard.writeText(url);

      // 显示通知
      const { Notification } = require('electron');
      new Notification({
        title: 'Gemini 授权',
        body: '授权链接已复制到剪贴板，请在浏览器中打开',
      }).show();

      // 阻止窗口打开
      return { action: 'deny' };
    }

    // 允许其他窗口
    return { action: 'allow' };
  });
});
```

**添加到代码**:
```bash
# 查找主进程入口
MAIN_ENTRY="src/index.ts"

if [ -f "$MAIN_ENTRY" ]; then
  # 检查是否已有拦截器
  if ! grep -q "setWindowOpenHandler" "$MAIN_ENTRY"; then
    echo "需要在 $MAIN_ENTRY 中添加窗口拦截器"
    # 建议手动添加到 app.ready 之前
  else
    echo "✓ 已存在窗口拦截器"
  fi
fi
```

### 3.6 解决方案 4: 禁用 DevTools 自动打开

**文件**: `src/index.ts`

```typescript
// 查找类似代码
if (!app.isPackaged) {
  mainWindow.webContents.openDevTools(); // ← 移除或注释
}

// 改为按需打开（通过菜单或快捷键）
// 在菜单中添加"打开开发者工具"选项
```

### 3.7 测试修复

```bash
# 1. 清除 Gemini 缓存的 token
rm -rf ~/Library/Application\ Support/蜂巢/gemini-tokens/ 2>/dev/null

# 2. 启动应用
npm start

# 3. 尝试使用 Gemini
# - 观察是否弹出新窗口
# - 检查控制台是否有授权链接
# - 验证是否可以正常使用

# 4. 查看日志
tail -f ~/Library/Logs/蜂巢/main.log
```

**验证清单**:
- [ ] 启动应用时没有弹出额外窗口
- [ ] 使用 Gemini 时不会自动打开浏览器
- [ ] OAuth 链接显示在控制台或复制到剪贴板
- [ ] Gemini 功能仍然正常工作

---

## 📦 总提交

### 提交策略

```bash
# 分三个提交，每个任务一个

# 1. UI 更新
git add src/renderer/design-system.ts \
        src/renderer/theme/ \
        src/renderer/components/ \
        src/renderer/pages/
git commit -m "feat(ui): 全面更新 UI 设计系统

- 创建统一的设计 tokens (颜色、间距、圆角、阴影)
- 更新全局样式和 CSS 变量
- 统一组件样式，使用设计系统
- 优化动画和过渡效果
- 改进暗色模式支持

涵盖组件:
- 聊天界面、侧边栏
- 设置面板、监控面板
- Provider 选择器、消息列表"

# 2. Provider 调整
git add src/agent/iflow/ \
        src/agent/ollama/ \
        src/renderer/config/modelPlatforms.ts \
        src/renderer/i18n/locales/
git rm -rf src/agent/droid/ 2>/dev/null
git commit -m "feat(providers): 移除 Droid，添加 iFlow 和 Ollama

移除:
- Droid agent 及相关代码
- Droid 配置和翻译

新增:
- iFlow agent (工作流自动化)
- Ollama agent (本地 LLM)
- 相应的配置和 i18n 支持

Provider 列表更新:
- Kimi, Qwen (快速)
- DeepSeek, iFlow (中速)
- Codex, Gemini (慢速)
- Ollama (本地/离线)"

# 3. Gemini 弹出修复
git add src/index.ts \
        src/agent/gemini/
git commit -m "fix(gemini): 阻止 Gemini CLI 自动弹出窗口

问题:
- Gemini OAuth 认证会自动打开浏览器窗口
- 影响用户体验

解决方案:
- 拦截窗口打开事件
- 将授权链接复制到剪贴板
- 显示桌面通知提示用户
- 禁用自动打开 DevTools

相关文件:
- src/index.ts: 添加 setWindowOpenHandler
- src/agent/gemini/: 更新 OAuth 流程"
```

### 最终验证

```bash
# 完整测试流程
echo "=== 最终验证 ==="

# 1. 清理并重新构建
rm -rf .webpack/ out/
npm run build

# 2. 启动应用
npm start &
sleep 10

# 3. 手动测试清单
cat << EOF

请手动测试以下功能:

UI 设计:
  [ ] 整体风格统一
  [ ] 颜色、间距、圆角一致
  [ ] 暗色模式正常
  [ ] 动画流畅

Provider:
  [ ] 看不到 Droid
  [ ] 可以看到 iFlow
  [ ] 可以看到 Ollama
  [ ] iFlow 可用
  [ ] Ollama 可用 (需先启动 ollama)

Gemini 弹出:
  [ ] 启动时无弹出
  [ ] 使用 Gemini 时无弹出
  [ ] 授权链接正确处理
  [ ] 功能正常

EOF

# 4. 检查日志
echo "按 Ctrl+C 停止日志查看"
tail -f ~/Library/Logs/蜂巢/main.log 2>/dev/null || \
  echo "日志文件不存在"
```

---

## 🎯 成功标准

### 任务 1: UI 设计
- [x] 创建设计系统文件
- [x] 全局样式统一
- [x] 核心组件样式更新
- [x] 暗色模式优化
- [x] 用户体验改进

### 任务 2: Provider 调整
- [x] Droid 完全移除
- [x] iFlow 功能完整
- [x] Ollama 功能完整
- [x] UI 列表更新
- [x] i18n 翻译完整

### 任务 3: Gemini 弹出修复
- [x] 不再自动弹出窗口
- [x] 授权流程友好
- [x] 功能不受影响
- [x] 用户体验提升

---

## ⏱️ 预计时间

| 任务 | 预计时间 |
|------|----------|
| 任务 1: UI 设计更新 | 120-180 分钟 |
| 任务 2: Provider 调整 | 60-90 分钟 |
| 任务 3: Gemini 弹出修复 | 30-45 分钟 |
| **总计** | **210-315 分钟** (3.5-5 小时) |

---

## 📝 执行顺序

**推荐顺序**:
```
任务 3 (最快) → 任务 2 (中等) → 任务 1 (最耗时)
```

**原因**:
1. 任务 3 最简单，快速完成建立信心
2. 任务 2 功能性改动，影响范围明确
3. 任务 1 需要大量细节调整，放在最后

---

**准备好了吗，Codex？请开始执行！** 🚀

**执行时每完成一个任务，请报告进度。**
