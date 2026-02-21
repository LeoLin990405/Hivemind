# Codex 任务：蜂巢桌面应用打包与全中文界面

**执行者**: Codex
**任务提交时间**: 2026-02-11
**工作目录**: `/Users/leo/.local/share/codex-dual/HiveMindUI`

---

## 任务概述

完成以下两个主要任务：
1. **打包 macOS 应用**：生成可安装的 DMG 文件
2. **UI 界面全中文**：将所有英文界面改为中文

---

## 任务 1: 打包 macOS 应用 (优先级 P0)

### 目标
生成 `Hivemind_1.8.5_arm64.dmg` 安装包，用户可双击安装到 `/Applications` 文件夹。

### 前置条件检查

1. **验证 Electron 安装**
```bash
cd /Users/leo/.local/share/codex-dual/HiveMindUI
npx electron --version
```
预期输出: `v37.3.1` 或类似版本号

2. **验证依赖完整性**
```bash
npm ls electron better-sqlite3 @electron-forge/cli
```
确保没有 `UNMET DEPENDENCY` 错误

### 步骤 1: 修复构建脚本（如果之前未修复）

**文件**: `scripts/build-with-builder.js`
**位置**: 第 160 行左右

**检查当前代码**:
```bash
grep -n "npm exec electron-forge\|npm run package" scripts/build-with-builder.js
```

**如果发现 `npm exec electron-forge`，则修改为**:
```javascript
execSync(`npm run package -- --arch=${targetArch}`, {
```

**验证修改**:
```bash
git diff scripts/build-with-builder.js
```

### 步骤 2: 设置镜像源（避免网络问题）

```bash
# 设置 Electron 镜像
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

# 设置 Electron Builder 镜像
export ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/

# 验证环境变量
echo "ELECTRON_MIRROR=$ELECTRON_MIRROR"
echo "ELECTRON_BUILDER_BINARIES_MIRROR=$ELECTRON_BUILDER_BINARIES_MIRROR"
```

### 步骤 3: 清理之前的构建产物

```bash
rm -rf out/
rm -rf .webpack/
rm -rf dist/
```

### 步骤 4: 执行构建（核心步骤）

**执行构建命令**:
```bash
npm run build-mac:arm64
```

**构建过程监控**:
- ✅ 预期看到: `✔ Compiling main process code`
- ✅ 预期看到: `✔ Building webpack bundles`
- ✅ 预期看到: `✔ Packaging for arm64 on darwin`
- ⚠️  如果出现网络错误，等待 30 秒后重试（最多 3 次）

**重试脚本**（如果首次失败）:
```bash
for i in 1 2 3; do
  echo "尝试 $i/3..."
  npm run build-mac:arm64 && break
  echo "失败，等待 30 秒后重试..."
  sleep 30
done
```

### 步骤 5: 验证构建产物

**检查生成的文件**:
```bash
ls -lh out/Hivemind-darwin-arm64/
ls -lh out/make/*.dmg
```

**预期输出**:
```
out/Hivemind-darwin-arm64/Hivemind.app/
out/make/Hivemind_1.8.5_arm64.dmg
```

**验证 DMG 文件大小**:
```bash
du -h out/make/*.dmg
```
预期大小: 150MB - 300MB

**验证应用元数据**:
```bash
/usr/libexec/PlistBuddy -c "Print :CFBundleName" \
  out/Hivemind-darwin-arm64/Hivemind.app/Contents/Info.plist
```
预期输出: `蜂巢` 或 `Hivemind`

### 步骤 6: 测试安装包

**挂载 DMG**:
```bash
hdiutil attach out/make/Hivemind_*.dmg
```

**验证应用签名**（可选）:
```bash
codesign -dv --verbose=4 /Volumes/Hivemind*/Hivemind.app
```

**卸载 DMG**:
```bash
hdiutil detach /Volumes/Hivemind*
```

### 步骤 7: 移动到用户目录

```bash
# 复制到用户下载文件夹
cp out/make/Hivemind_*.dmg ~/Downloads/

# 显示最终位置
ls -lh ~/Downloads/Hivemind_*.dmg
```

### 常见问题处理

#### 问题 1: "Client network socket disconnected"
**原因**: 下载 Electron 二进制文件失败
**解决**:
```bash
rm -rf node_modules/electron
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install electron --save-dev
```

#### 问题 2: "Compilation errors"
**原因**: TypeScript 编译错误
**解决**: 运行 `npm run lint:fix`，然后查看错误详情

#### 问题 3: "ENOSPC: no space left on device"
**原因**: 磁盘空间不足
**解决**:
```bash
df -h .
rm -rf out/ .webpack/ dist/
```

### 成功标准

- [x] DMG 文件存在于 `out/make/` 目录
- [x] 文件大小在 150MB - 300MB 之间
- [x] 双击 DMG 可以打开
- [x] 可以拖拽 Hivemind.app 到 Applications 文件夹
- [x] 应用名称显示为"蜂巢"

---

## 任务 2: UI 界面全中文 (优先级 P1)

### 目标
将所有英文 UI 文本替换为中文，包括菜单、按钮、提示信息、错误信息等。

### 当前状态分析

**已完成**:
- ✅ 应用名称改为"蜂巢"
- ✅ 6 种语言的 i18n 文件中 "HiveMindUI" → "Hivemind/蜂巢"

**待完成**:
- ⚠️  默认语言仍是英文 (en-US)
- ⚠️  部分硬编码英文文本
- ⚠️  错误信息使用英文

### 步骤 1: 设置默认语言为中文

**文件**: `src/renderer/i18n/index.ts`

**查找当前配置**:
```bash
grep -n "lng:\|fallbackLng:" src/renderer/i18n/index.ts
```

**修改配置**:
```typescript
// 找到 i18next.init() 配置
i18next.use(LanguageDetector).init({
  fallbackLng: 'zh-CN',  // 修改这里：'en-US' → 'zh-CN'
  lng: 'zh-CN',          // 添加这行（如果没有）
  // ... 其他配置
});
```

**验证修改**:
```bash
git diff src/renderer/i18n/index.ts
```

### 步骤 2: 检测硬编码英文文本

**搜索可疑的硬编码英文**:
```bash
# 搜索常见的硬编码模式
grep -r "placeholder=\|title=\|label=\|alt=" src/renderer/pages/ \
  | grep -v "t(" \
  | grep -v "i18n" \
  | grep "[A-Z][a-z]\+ " \
  | head -20
```

**搜索常见英文单词**:
```bash
grep -rn "Error\|Warning\|Success\|Loading\|Cancel\|Confirm\|Delete\|Edit\|Save" \
  src/renderer/components/ \
  | grep -v "t(" \
  | grep -v "\.ts$" \
  | head -30
```

### 步骤 3: 修复硬编码文本（示例）

**如果发现类似代码**:
```typescript
<Button>Cancel</Button>  // ❌ 硬编码
```

**修改为**:
```typescript
<Button>{t('common.cancel')}</Button>  // ✅ 使用 i18n
```

**同时在 i18n 文件中添加翻译**:

**文件**: `src/renderer/i18n/locales/zh-CN.json`
```json
{
  "common": {
    "cancel": "取消",
    "confirm": "确认",
    "delete": "删除",
    "edit": "编辑",
    "save": "保存"
  }
}
```

### 步骤 4: 更新应用菜单为中文

**文件**: `src/utils/appMenu.ts`

**查找菜单定义**:
```bash
grep -n "label:" src/utils/appMenu.ts | head -20
```

**修改菜单文本**（示例）:
```typescript
// 之前
{ label: 'File', submenu: [...] }

// 修改为
{ label: '文件', submenu: [
  { label: '新建会话', accelerator: 'CmdOrCtrl+N', ... },
  { label: '打开...', accelerator: 'CmdOrCtrl+O', ... },
  { type: 'separator' },
  { label: '退出', role: 'quit' }
]}
```

**常见菜单翻译对照**:
| 英文 | 中文 |
|------|------|
| File | 文件 |
| Edit | 编辑 |
| View | 查看 |
| Window | 窗口 |
| Help | 帮助 |
| Settings | 设置 |
| Preferences | 偏好设置 |

### 步骤 5: 更新 Electron 通知/对话框

**文件**: `src/process/bridge/dialogBridge.ts` 或类似文件

**查找对话框文本**:
```bash
grep -rn "dialog.show\|notification" src/process/
```

**确保所有对话框使用 i18n**:
```typescript
// 之前
dialog.showErrorBox('Error', 'Something went wrong')

// 修改为
const { t } = require('../i18n');  // 如果在 main process
dialog.showErrorBox(t('error.title'), t('error.generic'))
```

### 步骤 6: 处理日期/时间格式

**文件**: `src/renderer/utils/` 下的日期处理文件

**使用中文日期格式**:
```typescript
// 使用 Intl API
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

// 或使用 i18n 格式化
t('date.format', { date: new Date() })
```

### 步骤 7: 更新占位符文本

**搜索所有 placeholder**:
```bash
grep -rn "placeholder=" src/renderer/ | grep -v "t(" | head -20
```

**修改示例**:
```typescript
// 之前
<Input placeholder="Enter your message..." />

// 修改为
<Input placeholder={t('chat.inputPlaceholder')} />
```

**在 zh-CN.json 中添加**:
```json
{
  "chat": {
    "inputPlaceholder": "输入你的消息..."
  }
}
```

### 步骤 8: 验证全中文界面

**启动应用**:
```bash
npm start
```

**手动检查清单**:
- [ ] 应用标题显示"蜂巢"
- [ ] 菜单栏全部为中文
- [ ] 设置面板全部为中文
- [ ] 按钮文本全部为中文
- [ ] 输入框占位符全部为中文
- [ ] 错误提示全部为中文
- [ ] 日期时间格式为中文
- [ ] 右键菜单全部为中文

**自动化检测**:
```bash
# 搜索可能遗漏的英文文本
npm start &
sleep 30
# 查看开发者工具 Console，搜索英文关键词
```

### 步骤 9: 更新翻译文件完整性

**检查所有 key 是否都有中文翻译**:
```bash
# 对比 en-US.json 和 zh-CN.json 的 key
node -e "
const enKeys = Object.keys(require('./src/renderer/i18n/locales/en-US.json'));
const zhKeys = Object.keys(require('./src/renderer/i18n/locales/zh-CN.json'));
const missing = enKeys.filter(k => !zhKeys.includes(k));
console.log('Missing Chinese translations:', missing);
"
```

### 步骤 10: 提交全中文界面改动

```bash
git add -A
git commit -m "feat(i18n): 完整中文界面支持

- 设置默认语言为 zh-CN
- 移除所有硬编码英文文本
- 更新应用菜单为中文
- 统一日期时间格式为中文
- 补充缺失的中文翻译

涵盖范围:
- 主界面、设置面板、聊天界面
- 菜单栏、右键菜单、对话框
- 错误提示、通知消息
- 占位符文本、按钮标签"
```

---

## 执行顺序建议

### 阶段 1: 先打包再中文化（推荐）
```
1. 执行任务 1（打包）→ 生成当前版本的 DMG
2. 执行任务 2（全中文）→ 修改 UI
3. 重新打包 → 生成全中文版 DMG
```

**理由**: 先保留一份英文版备份，再进行大范围修改。

### 阶段 2: 先中文化再打包（快速）
```
1. 执行任务 2（全中文）→ 修改 UI
2. 执行任务 1（打包）→ 直接生成全中文版 DMG
```

**理由**: 一次性完成，减少构建次数。

---

## 预期时间估算

| 任务 | 预计时间 |
|------|----------|
| 任务 1: 打包应用 | 15-30 分钟（含网络下载时间）|
| 任务 2: 全中文界面 | 30-60 分钟（取决于硬编码数量）|
| 总计 | 45-90 分钟 |

---

## 最终交付物

### 必须交付
1. ✅ `Hivemind_1.8.5_arm64.dmg` - macOS 安装包
2. ✅ 全中文界面的应用（默认语言 zh-CN）

### 可选交付
3. 📋 硬编码文本修复清单
4. 📋 i18n 覆盖率报告
5. 📸 中文界面截图（用于验证）

---

## 验收标准

### 打包任务
- [x] DMG 文件存在且大小正常
- [x] 双击 DMG 可以安装
- [x] 安装后应用可以正常启动
- [x] 应用名称显示"蜂巢"

### 全中文任务
- [x] 应用首次启动默认语言为中文
- [x] 所有菜单项为中文
- [x] 所有按钮和标签为中文
- [x] 无明显硬编码英文文本
- [x] 错误提示为中文

---

## 紧急联系

如遇到无法解决的问题，记录以下信息：
1. 错误信息完整输出
2. 执行的命令
3. 系统环境（`uname -a`, `node -v`, `npm -v`）
4. 相关日志文件路径

然后向 Claude 反馈获取支持。

---

**准备好了吗，Codex？开始执行！** 🚀
