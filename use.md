# Smart Exam Assistant — 使用说明 / Usage Guide

> 目标站点：**https://study.nsu.edu.cn/**

本扩展是一个 Chrome Manifest V3 插件，通过 Content Script 解析考试页面 DOM，调用 AI 提供商（OpenAI / Gemini / Qwen）完成自动答题。所有配置保存在 `chrome.storage.sync`，AI 批量结果缓存在 `chrome.storage.local.ai_cache`（调试时遇到陈旧缓存可手动清除）。

---

## 1. 安装

本仓库无构建步骤，直接以"已解压的扩展程序"形式加载：

1. 打开 Chrome，访问 `chrome://extensions/`
2. 右上角开启 **开发者模式 (Developer mode)**
3. 点击左上 **加载已解压的扩展程序 (Load unpacked)**
4. 选择本仓库根目录（含 `manifest.json` 的目录）
5. 安装后图标会出现在工具栏。每次改完代码，回到 `chrome://extensions/` 点击该扩展的 **重新加载 (Reload)** 即可生效。

> 该扩展仅在 `https://study.nsu.edu.cn/*` 下注入 content script；其它页面不会激活。

---

## 2. 首次配置（Popup 弹窗）

点击工具栏图标打开 **Exam Assistant Config** 面板：

| 字段 | 说明 |
| --- | --- |
| **API Provider** | 选择 `openai` / `gemini` / `qwen` |
| **API Key** | 对应平台的 Key（存于 `chrome.storage.sync.apiKey`，仅本地） |
| **Model Name** | 留空则使用代码内的默认值：`gpt-3.5-turbo` / `gemini-1.5-flash` / `qwen-plus` |
| **Enable Debug Mode** | 勾选后，AI 返回答案时会弹出一个验证浮窗，让你人工确认是否应用该题（与 `Alt+D` 互为开关） |
| **Short Answer Prompt** | 自定义简答题的系统提示词；留空使用默认（"直接简洁地回答"） |

点击 **Save Settings** 即保存到 `chrome.storage.sync`。

### 推荐模型

- OpenAI：`gpt-4o-mini`（性价比）/ `gpt-4o`（质量更高）
- Gemini：`gemini-1.5-flash`（速度）/ `gemini-1.5-pro`
- Qwen：`qwen-plus` / `qwen-turbo`

### 主机权限

`manifest.json` 已声明下列域名，扩展只能向这些域名发起网络请求：

- `https://study.nsu.edu.cn/*`
- `https://api.openai.com/*`
- `https://generativelanguage.googleapis.com/*`
- `https://dashscope.aliyuncs.com/*`

---

## 3. 快捷键（在考试页面内生效）

全局监听挂在 `document` 上，仅在 `study.nsu.edu.cn` 域下触发。

| 快捷键 | 行为 | 对应 `content.js` 入口 |
| --- | --- | --- |
| `Alt + T` | 切换自动答题：未运行则 **开始**（受 Debug Mode 影响），运行中则 **停止** | `assistant.start()` / `assistant.stop()` |
| `Alt + M` | 把当前题目的题干复制到剪贴板（不含题号） | `assistant.copyQuestion()` |
| `Alt + D` | **跳过 Debug 验证**直接开始自动答题（与 `Alt+T` 等价但强制禁用本次的二次确认浮窗） | `assistant.startWithoutDebug()` |
| `Alt + T`（验证浮窗内） | 关闭浮窗并停止本次循环 | 验证模态内 keydown 监听 |

> 如果浏览器把 `Alt+T` 等组合映射给了其它功能（部分站点会拦截），请先在页面上点击一次让焦点回到正文再试。

---

## 4. 悬浮控制条（页面内 UI）

进入考试页后，右下角会出现半透明悬浮控制条（可拖动，位置写入 `chrome.storage.local.debugModalPos`）：

- **Copy**：同 `Alt+M`，复制当前题干
- **Start**：同 `Alt+T`（受 Debug Mode 影响）
- **Pause**：停止自动循环
- **Next**：手动跳到下一题
- **Auto On/Off**：切换 `autoMode`（写入 `chrome.storage.sync.autoMode`）。开启后，Start 状态显示为 `Started (Auto)`，并在 `Alt+D` 时显示 `Started (Auto, Debug Disabled)`；关闭时回到单题手动模式。

控制条顶部的状态点会根据阶段变色：

- 蓝色：等待 / 默认
- 橙色：Thinking (AI)…
- 绿色：copied / Answered / filled
- 红色：Error / failed / Could not…

---

## 5. 批量答题工作流（Popup 弹窗）

Popup 下半部分的 **Detected Questions** 区域提供批量流程：

1. **Fetch Questions From Page**：向当前 tab 发送 `GET_ALL_QUESTIONS`，列出所有可识别的题目（`q-` 前缀表示支持自动应用，`q-split-*` 暂仅用于展示）。
2. **Select On Page**：发送 `START_AREA_SELECT`，在页面上框选一个区域，仅返回该区域内的题目，便于过滤题库。
3. 勾选想处理的题目 → **Request AI for Selected** 触发 `GET_AI_ANSWERS_BATCH`：
   - 并发度 3，每批之间延迟 250ms
   - 结果会写入 `chrome.storage.local.ai_cache`（按 prompt 哈希做键）。相同题面会命中缓存。
4. **Apply Selected** 触发 `APPLY_ANSWERS_BATCH`：
   - 仅 `id` 以 `q-` 开头的题目会被自动填入；`q-split-*` 会回显 `apply not supported for this id`
   - 单选 / 多选走 `selectOption`，简答题走 `fillAnswer` 写入输入框
5. 单题旁的 **Highlight** 按钮发送 `HIGHLIGHT_QUESTION`，在页面上平滑滚动并临时高亮对应题块。

---

## 6. 调试 / 排错

- **Content Script 日志**：在考试页面 DevTools Console 查看，扩展统一前缀 `[ExamAssistant]`。
- **Background 日志**：`chrome://extensions/` → 该扩展 → "service worker" → Console。批量 AI 失败会打印 `AI Request Failed: ...`。
- **Popup 日志**：右键工具栏图标 → "检查弹出内容"。
- **AI 缓存清理**：`chrome.storage.local.remove('ai_cache')` 可清空批量结果缓存。
- **Debug Mode**：在 Popup 勾选 *Enable Debug Mode* 后，AI 给出的答案会先弹窗让你确认；如不希望打断流程，使用 `Alt + D` 临时跳过，或直接取消勾选。
- **站点结构变更**：`content.js` 的提取逻辑依赖 `.item-box`、`.qusetion-info`、`.question-type .el-tag__content`、`.el-radio-group`、`.el-checkbox-group`、`.q-num-box.haveActive` 等选择器；如果官方改版导致识别失败，请先在目标页面 DevTools 中核对 DOM，再调整 `content.js`。
- **AI 答非所问**：通常是 Prompt 解析问题，可在 *Short Answer Prompt* 中追加学科/格式说明；选择题则检查模型是否遵循"只输出字母"的指令（代码里只取 `A-Z` 字符）。

---

## 7. 常见问题

- **点击图标没有反应 / 报 "Content script not available on this page"**：当前标签页不是 `study.nsu.edu.cn/*`，切到考试页再试。
- **API Key 报错**：`API Key missing` 表示 Popup 没保存或 Key 为空；`401/403` 多半是 Key 无效或余额不足。
- **批量应用后部分题目没填上**：检查题目 ID 是否以 `q-` 开头；`q-split-*` 不会自动写入，需要手动填。
- **扩展突然停止**：通常是 DOM 选择器失效、网络异常或题库到达末尾；Console 里的红色 `updateStatus` 会给出原因。

---

## 8. 注意事项

- API Key 仅存于本地 `chrome.storage.sync`，请勿提交到仓库或分享给他人。
- 请确保使用方式符合考试平台与学校规定。
- 本仓库无 `npm` / 构建 / 测试 / 格式化流水线；所有验证都在浏览器里手动完成。
