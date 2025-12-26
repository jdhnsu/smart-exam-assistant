# Smart Exam Assistant - API & Data Interface Documentation

## 1. 概述 (Overview)
本文档描述了 Smart Exam Assistant (智能考试助手) 的核心数据接口。
由于本系统是一个浏览器扩展，"题目获取"主要通过 DOM 解析实现，而"答案获取"则通过内部消息总线调用外部 AI 服务。
为了规范开发和维护，我们将内部消息通讯机制和外部服务调用抽象为 API 接口进行文档化。

---

## 2. 内部核心接口 (Internal Core API)
本接口用于 Content Script (前台页面) 与 Background Service (后台服务) 之间的通讯，实现题目分析与答案获取功能。

### 2.1 获取 AI 答案 (Get AI Answer)
此接口接收前端提取的题目数据，根据配置调度相应的 AI 模型进行推理，并返回答案。

- **端点 (Endpoint/Action):** `GET_AI_ANSWER`
- **通信方式:** `chrome.runtime.sendMessage`
- **处理服务:** `background.js` -> `handleAIRequest`

#### 请求说明 (Request)
- **Method:** `MESSAGE`
- **Data Structure:** JSON

| 参数名 | 类型 | 必填 | 说明 | 示例 |
| :--- | :--- | :--- | :--- | :--- |
| `action` | String | 是 | 固定值 | `"GET_AI_ANSWER"` |
| `data` | Object | 是 | 题目数据对象 | (见下方 data 结构) |

**`data` 参数详解:**
| 字段 | 类型 | 说明 | 取值范围 |
| :--- | :--- | :--- | :--- |
| `question` | String | 题干文本 | 任意非空字符串 |
| `type` | String | 题目类型 | `"radio"` (单选), `"checkbox"` (多选) |
| `options` | Array | 选项列表 | 包含 `letter` 和 `text` 的对象数组 |

#### 请求示例 (Example)
```javascript
chrome.runtime.sendMessage({
  action: "GET_AI_ANSWER",
  data: {
    question: "今住んでいるところは通勤が便利で（助かって） いる。",
    type: "radio",
    options: [
      { "letter": "A", "text": "たすかって" },
      { "letter": "B", "text": "すくって" },
      { "letter": "C", "text": "てつだって" },
      { "letter": "D", "text": "ひろって" }
    ]
  }
});
```

#### 响应说明 (Response)
- **Format:** JSON

| 字段 | 类型 | 说明 | 示例 |
| :--- | :--- | :--- | :--- |
| `answer` | String | AI 预测的正确选项字母 (多选时拼接) | `"A"` 或 `"AC"` |
| `error` | String | 错误信息 (仅在失败时返回) | `"API Key missing"` |

#### 响应示例 (Success)
```json
{
  "answer": "A"
}
```

#### 响应示例 (Error)
```json
{
  "error": "Network Error: Failed to fetch"
}
```

#### 状态码与错误处理
由于是内部消息，不使用 HTTP 状态码，而是通过 `chrome.runtime.lastError` 或响应对象的 `error` 字段判断。
- **System Error:** `chrome.runtime.lastError` (如连接中断)
- **Application Error:** 返回 `{ error: "..." }` (如 API Key 无效)

---

## 3. 外部服务接口 (External Service APIs)
本扩展作为客户端，代理调用以下第三方大模型 API。

### 3.1 OpenAI Chat API
用于调用 GPT 系列模型。

- **Endpoint:** `https://api.openai.com/v1/chat/completions`
- **Method:** `POST`
- **Auth:** Bearer Token (User API Key)

#### 关键参数
- `model`: 用户配置 (如 `gpt-3.5-turbo`)
- `messages`: `[{ role: "user", content: prompt }]`
- `temperature`: `0` (确保答案确定性)

### 3.2 Google Gemini API
用于调用 Gemini Pro/Flash 模型。

- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **Method:** `POST`
- **Auth:** Query Param `?key={API_KEY}`

### 3.3 Aliyun DashScope (Qwen)
用于调用通义千问模型 (兼容 OpenAI 格式)。

- **Endpoint:** `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
- **Method:** `POST`
- **Auth:** Bearer Token

---

## 4. 题目数据模型 (Question Data Model)
这是系统内部流转的"题目"标准结构 (Schema)，由 `content.js` 解析生成。

```typescript
interface Question {
  // 题干内容
  question: string;
  
  // 题目类型：决定了是单选还是多选逻辑
  type: 'radio' | 'checkbox';
  
  // 选项列表
  options: Option[];
}

interface Option {
  // 选项标识符 (A, B, C, D...)
  letter: string;
  
  // 选项文本内容
  text: string;
}
```

## 5. 版本记录 (Version History)
- **v1.0.0** (2025-12-26): 初始版本，支持 OpenAI, Gemini, Qwen 三种后端，支持单选/多选自动识别。

## 6. 性能指标 (Performance)
- **响应时间 (Latency):**
  - OpenAI/Qwen: 平均 2-5 秒 (取决于模型复杂度和网络状况)。
  - Gemini: 平均 1-3 秒。
- **并发能力 (Concurrency):**
  - 插件本身设计为串行处理 (单题处理完毕后才进行下一题)，以模拟人类行为并规避反作弊检测。
  - 建议并发数: 1 (Single Threaded).

## 7. 使用场景与限制 (Usage & Limits)
- **场景:** 用户在 `study.nsu.edu.cn` 考试页面开启"自动答题"模式。
- **限制:** 
  - 必须保持考试页面为当前激活标签页。
  - 依赖 DOM 结构稳定性，若学校网站改版，需更新 `extractQuestionData` 逻辑。
  - API 调用频率受限于用户个人的 API Key 配额。

## 7. 接口测试用例 (Interface Test Cases)

### TC-01: 标准单选题 (Standard Radio)
- **输入:**
  ```json
  {
    "action": "GET_AI_ANSWER",
    "data": {
      "question": "1+1=?",
      "type": "radio",
      "options": [
        { "letter": "A", "text": "1" },
        { "letter": "B", "text": "2" }
      ]
    }
  }
  ```
- **预期结果:**
  ```json
  { "answer": "B" }
  ```

### TC-02: 多选题 (Checkbox)
- **输入:**
  ```json
  {
    "action": "GET_AI_ANSWER",
    "data": {
      "question": "哪些是水果?",
      "type": "checkbox",
      "options": [
        { "letter": "A", "text": "苹果" },
        { "letter": "B", "text": "白菜" },
        { "letter": "C", "text": "香蕉" }
      ]
    }
  }
  ```
- **预期结果:**
  ```json
  { "answer": "AC" }
  ```

### TC-03: 缺失 API Key (Missing Key)
- **前置条件:** Storage 中未设置 apiKey。
- **输入:** (同 TC-01)
- **预期结果:**
  ```json
  { "error": "API Key missing" }
  ```
