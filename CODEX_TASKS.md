# Codex 执行任务：蜂巢应用打包与全中文界面

**工作目录**: `/Users/leo/.local/share/codex-dual/HiveMindUI`
**执行时间**: 2026-02-11
**目标**: 完成两个任务 - 打包 macOS 应用 + UI 全中文化

---

## 执行策略

**推荐顺序**：先全中文化，再打包（一次性完成）

```
任务 2（全中文化）→ 任务 1（打包）→ 交付
```

---

## 任务 2: UI 界面全中文化（优先执行）

### 步骤 2.1: 设置默认语言为中文

**文件**: `src/renderer/i18n/index.ts`

查找并修改：
```typescript
// 查找 i18next.init() 配置
// 将 fallbackLng 从 'en-US' 改为 'zh-CN'
// 添加或修改 lng: 'zh-CN'

i18next.use(LanguageDetector).init({
  fallbackLng: 'zh-CN',  // 修改这里
  lng: 'zh-CN',          // 确保这行存在
  // ... 保持其他配置不变
});
```

**验证**:
```bash
grep -A 5 "fallbackLng" src/renderer/i18n/index.ts
```

### 步骤 2.2: 检测硬编码英文文本

**运行检测脚本**:
```bash
# 检测常见硬编码模式
echo "=== 检测 placeholder 硬编码 ==="
grep -rn "placeholder=" src/renderer/pages/ src/renderer/components/ \
  | grep -v "t(" \
  | grep -v "i18n" \
  | grep "[A-Z][a-z]"

echo -e "\n=== 检测按钮/标签硬编码 ==="
grep -rn ">Cancel<\|>Confirm<\|>Delete<\|>Save<\|>Edit<\|>Close<" \
  src/renderer/ \
  | grep -v "t("

echo -e "\n=== 检测字符串字面量 ==="
grep -rn "\"Error\"\|\"Warning\"\|\"Success\"\|'Loading'" \
  src/renderer/ \
  | grep -v "console\|import\|from\|//"
```

**将输出结果整理成清单**，然后逐个修复。

### 步骤 2.3: 修复硬编码文本（通用模板）

**修改前**:
```typescript
<Button>Cancel</Button>
<Input placeholder="Enter text..." />
<Message type="error">Error occurred</Message>
```

**修改后**:
```typescript
<Button>{t('common.cancel')}</Button>
<Input placeholder={t('common.inputPlaceholder')} />
<Message type="error">{t('error.generic')}</Message>
```

**同时在 i18n 文件中添加翻译**:

**文件**: `src/renderer/i18n/locales/zh-CN.json`

在相应位置添加：
```json
{
  "common": {
    "cancel": "取消",
    "confirm": "确认",
    "delete": "删除",
    "save": "保存",
    "edit": "编辑",
    "close": "关闭",
    "inputPlaceholder": "请输入..."
  },
  "error": {
    "generic": "操作失败，请重试"
  }
}
```

### 步骤 2.4: 更新应用菜单

**文件**: `src/utils/appMenu.ts`

**查找所有 label**:
```bash
grep -n "label:" src/utils/appMenu.ts
```

**翻译对照表**:
```
File → 文件
Edit → 编辑
View → 查看
Window → 窗口
Help → 帮助
Settings → 设置
Preferences → 偏好设置
New → 新建
Open → 打开
Save → 保存
Close → 关闭
Quit → 退出
Copy → 复制
Paste → 粘贴
Undo → 撤销
Redo → 重做
```

**修改示例**:
```typescript
const template = [
  {
    label: '文件',
    submenu: [
      { label: '新建', accelerator: 'CmdOrCtrl+N', ... },
      { label: '打开...', accelerator: 'CmdOrCtrl+O', ... },
      { type: 'separator' },
      { label: '退出', role: 'quit' }
    ]
  },
  {
    label: '编辑',
    submenu: [
      { label: '撤销', role: 'undo' },
      { label: '重做', role: 'redo' },
      { type: 'separator' },
      { label: '剪切', role: 'cut' },
      { label: '复制', role: 'copy' },
      { label: '粘贴', role: 'paste' }
    ]
  }
  // ... 继续其他菜单项
];
```

### 步骤 2.5: 验证全中文界面

**启动应用测试**:
```bash
cd /Users/leo/.local/share/codex-dual/HiveMindUI
npm start
```

**手动验证清单**:
- [ ] 应用标题显示"蜂巢 - Hivemind"
- [ ] 菜单栏所有项目为中文
- [ ] 按钮文本为中文
- [ ] 输入框占位符为中文
- [ ] 错误提示为中文
- [ ] 设置面板为中文

**如果发现遗漏的英文**:
1. 记录位置（文件名 + 行号）
2. 按照步骤 2.3 的模板修复
3. 重新测试

### 步骤 2.6: 提交全中文改动

```bash
cd /Users/leo/.local/share/codex-dual/HiveMindUI

# 查看修改
git status
git diff

# 提交
git add -A
git commit -m "feat(i18n): 实现完整中文界面

- 设置默认语言为 zh-CN
- 移除硬编码英文文本
- 更新应用菜单为中文
- 统一 UI 文本为中文

涵盖：菜单、按钮、占位符、错误提示"

# 查看提交
git log --oneline -1
```

---

## 任务 1: 打包 macOS 应用

### 步骤 1.1: 环境准备

```bash
cd /Users/leo/.local/share/codex-dual/HiveMindUI

# 设置镜像源
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
export ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/

# 验证环境
echo "✓ ELECTRON_MIRROR=$ELECTRON_MIRROR"
npx electron --version || echo "⚠ Electron 未安装"
npm ls @electron-forge/cli | grep "@electron-forge/cli" || echo "⚠ Forge 未安装"
```

### 步骤 1.2: 清理旧构建

```bash
rm -rf out/
rm -rf .webpack/
rm -rf dist/

echo "✓ 清理完成"
```

### 步骤 1.3: 验证构建脚本

**检查文件**: `scripts/build-with-builder.js`

```bash
# 查找关键行
grep -n "execSync.*electron-forge\|npm run package" scripts/build-with-builder.js
```

**应该看到**:
```javascript
execSync(`npm run package -- --arch=${targetArch}`, {
```

**如果看到的是** `npm exec electron-forge`，则修改为上面的正确版本。

### 步骤 1.4: 执行构建

**单次构建**:
```bash
npm run build-mac:arm64 2>&1 | tee build.log
```

**带重试的构建**（推荐）:
```bash
for attempt in 1 2 3; do
  echo "=== 构建尝试 $attempt/3 ==="
  npm run build-mac:arm64 2>&1 | tee build-attempt-$attempt.log

  if [ $? -eq 0 ]; then
    echo "✓ 构建成功！"
    break
  else
    echo "✗ 构建失败"
    if [ $attempt -lt 3 ]; then
      echo "等待 30 秒后重试..."
      sleep 30
    fi
  fi
done
```

**预期输出关键信息**:
```
✔ Compiling main process code
✔ Building webpack bundles
✔ Packaging for arm64 on darwin
✔ Packaging application
```

### 步骤 1.5: 验证构建产物

```bash
echo "=== 检查生成的文件 ==="
ls -lh out/Hivemind-darwin-arm64/ 2>/dev/null || echo "✗ 应用未生成"
ls -lh out/make/*.dmg 2>/dev/null || echo "✗ DMG 未生成"

echo -e "\n=== 验证 DMG 文件 ==="
if [ -f out/make/Hivemind_*.dmg ]; then
  DMG_FILE=$(ls out/make/Hivemind_*.dmg)
  echo "✓ DMG 文件: $DMG_FILE"
  echo "✓ 文件大小: $(du -h "$DMG_FILE" | cut -f1)"

  # 验证元数据
  echo -e "\n=== 验证应用元数据 ==="
  /usr/libexec/PlistBuddy -c "Print :CFBundleName" \
    out/Hivemind-darwin-arm64/Hivemind.app/Contents/Info.plist
  /usr/libexec/PlistBuddy -c "Print :CFBundleDisplayName" \
    out/Hivemind-darwin-arm64/Hivemind.app/Contents/Info.plist
else
  echo "✗ DMG 文件不存在"
  exit 1
fi
```

### 步骤 1.6: 测试安装包

```bash
# 挂载 DMG
DMG_FILE=$(ls out/make/Hivemind_*.dmg)
hdiutil attach "$DMG_FILE"

# 等待挂载完成
sleep 2

# 检查挂载点
ls /Volumes/Hivemind*/

# 卸载
hdiutil detach /Volumes/Hivemind* 2>/dev/null

echo "✓ DMG 测试通过"
```

### 步骤 1.7: 复制到用户目录

```bash
DMG_FILE=$(ls out/make/Hivemind_*.dmg)
cp "$DMG_FILE" ~/Downloads/

echo "=== 最终交付 ==="
ls -lh ~/Downloads/Hivemind_*.dmg
echo "✓ 安装包已复制到 ~/Downloads/"
```

### 步骤 1.8: 提交打包配置

```bash
cd /Users/leo/.local/share/codex-dual

# 检查是否有构建脚本修改
git diff HiveMindUI/scripts/build-with-builder.js

# 如果有修改则提交
if ! git diff --quiet HiveMindUI/scripts/build-with-builder.js; then
  git add HiveMindUI/scripts/build-with-builder.js
  git commit -m "fix(build): 修复构建脚本的 electron-forge 调用

使用 npm run package 替代 npm exec electron-forge
避免安装过时的 electron-forge@5.2.4"
fi
```

---

## 常见问题处理

### 问题 1: 网络超时

**症状**:
```
Client network socket disconnected
RequestError: socket hang up
```

**解决**:
```bash
# 重新安装 Electron
rm -rf node_modules/electron
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ \
  npm install electron --save-dev

# 然后重新构建
npm run build-mac:arm64
```

### 问题 2: TypeScript 编译错误

**症状**:
```
TS2322: Type 'X' is not assignable to type 'Y'
```

**解决**:
```bash
# 运行 lint 自动修复
npm run lint:fix

# 查看具体错误
npm run build 2>&1 | grep "ERROR in"

# 根据错误信息手动修复
```

### 问题 3: 磁盘空间不足

**症状**:
```
ENOSPC: no space left on device
```

**解决**:
```bash
# 检查空间
df -h /Users/leo/.local/share/codex-dual/HiveMindUI

# 清理构建产物
rm -rf out/ .webpack/ dist/ node_modules/.cache/

# 如果还不够，清理 npm 缓存
npm cache clean --force
```

### 问题 4: 构建脚本错误

**症状**:
```
Command failed: npm exec electron-forge
electron-forge: command not found
```

**解决**: 按照步骤 1.3 修复 `scripts/build-with-builder.js`

---

## 执行报告模板

完成后，提供以下报告：

```
=== 蜂巢应用任务执行报告 ===

## 任务 2: UI 全中文化
状态: [✓ 完成 / ✗ 失败]

修改文件:
- src/renderer/i18n/index.ts (设置默认语言)
- src/utils/appMenu.ts (菜单翻译)
- src/renderer/i18n/locales/zh-CN.json (补充翻译)
- [其他修改的文件...]

硬编码修复数量: X 处
提交 commit: [commit hash]

## 任务 1: 打包 macOS 应用
状态: [✓ 完成 / ✗ 失败]

构建尝试次数: X 次
DMG 文件: ~/Downloads/Hivemind_1.8.5_arm64.dmg
文件大小: XXX MB
验证结果: [✓ 通过 / ✗ 失败]

## 遇到的问题
[列出问题及解决方案]

## 待办事项
[如果有未完成的事项]
```

---

## 开始执行

**推荐执行顺序**:
```bash
cd /Users/leo/.local/share/codex-dual/HiveMindUI

# 1. 全中文化
执行任务 2 的步骤 2.1 → 2.6

# 2. 打包
执行任务 1 的步骤 1.1 → 1.8

# 3. 生成报告
```

**预计总耗时**: 45-90 分钟

**开始吧！** 🚀
