# Smart Exam Assistant

## 中文

### 项目概述

**项目名称**: Smart Exam Assistant (智能考试助手)

**项目简介**: 这是一个基于 Chrome 浏览器扩展的智能考试辅助工具，能够自动识别考试页面中的题目，调用 AI 模型进行分析并自动选择答案，极大提升在线考试效率。

**主要功能特性**:
- 🎯 **智能题目识别**: 自动解析考试页面中的题目内容和选项
- 🤖 **AI 智能答题**: 集成 OpenAI GPT 和 Google Gemini 模型进行智能分析
- ⚡ **一键自动答题**: 支持连续自动答题，无需手动干预
- 🎨 **隐蔽模式设计**: 半透明悬浮窗设计，不影响正常考试操作
- ⌨️ **快捷键支持**: Alt+T 快速启动/停止自动答题
- 🛡️ **安全保护**: 本地存储 API 密钥，确保数据安全

**技术栈说明**:
- **前端**: HTML5, CSS3, JavaScript ES6+
- **浏览器 API**: Chrome Extension API, Content Script
- **AI 服务**: OpenAI GPT API, Google Gemini API
- **数据存储**: Chrome Storage API

**适用场景**:
- 在线教育平台考试
- 企业培训测试
- 知识竞赛答题
- 任何基于 Web 的标准化测试

### 快速开始指南

#### 系统环境要求
- **浏览器**: Google Chrome 88+ 或基于 Chromium 的浏览器
- **操作系统**: Windows 10+, macOS 10.14+, Linux
- **网络**: 稳定的互联网连接（用于调用 AI API）

#### 安装步骤

1. **下载项目**
```bash
git clone https://github.com/your-username/smart-exam-assistant.git
cd smart-exam-assistant
```

2. **加载扩展到 Chrome**
   - 打开 Chrome 浏览器，访问 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目文件夹 `smart-exam-assistant`

3. **验证安装**
   - 扩展图标应出现在浏览器工具栏
   - 点击图标可打开设置面板

#### 配置说明

1. **API 配置**
   - 点击扩展图标打开设置面板
   - 选择 AI 提供商（OpenAI 或 Gemini）
   - 输入对应的 API 密钥
   - 选择模型版本（推荐使用 gpt-4o-mini 或 gemini-1.5-flash）

2. **高级设置**
   ```javascript
   // 支持的模型配置
   const MODELS = {
     openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
     gemini: ['gemini-1.5-flash', 'gemini-1.5-pro']
   };
   ```

#### 运行方法

1. **访问考试页面**
   - 打开目标考试网站（如 study.nsu.edu.cn）
   - 确保题目页面完全加载

2. **启动助手**
   - 点击扩展图标，选择"开始自动答题"
   - 或使用快捷键 `Alt + T`

3. **监控状态**
   - 右下角悬浮窗显示当前状态
   - 绿色表示正在运行，红色表示已暂停

### 详细使用教程

#### 核心功能分步说明

**第一步：题目识别**
```javascript
// 自动识别当前页面中的题目
const questionEl = this.findCurrentQuestion();
const data = this.extractQuestionData(questionEl);
```

**第二步：AI 分析**
```javascript
// 发送题目到 AI 服务
const answer = await this.fetchAnswer(data);
```

**第三步：自动答题**
```javascript
// 自动选择答案
const success = this.selectOption(questionEl, answer);
```

**第四步：导航到下一题**
```javascript
// 自动点击"下一题"按钮
this.goToNextQuestion();
```

#### 示例代码片段

**题目解析示例**:
```javascript
{
  "question": "以下哪个是 JavaScript 的数据类型？",
  "options": [
    {"letter": "A", "text": "String"},
    {"letter": "B", "text": "Integer"},
    {"letter": "C", "text": "Float"},
    {"letter": "D", "text": "Char"}
  ],
  "type": "radio"
}
```

**API 调用示例**:
```javascript
// 发送到 OpenAI API
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `请回答这个问题：${question}，选项：${options}`
    }]
  })
});
```

#### 常见问题解答

**Q1: 扩展无法识别题目？**
- 确保考试页面完全加载
- 检查题目是否使用了标准的 HTML 结构
- 尝试刷新页面后重新启动

**Q2: AI 答案不准确？**
- 检查 API 密钥是否正确配置
- 尝试切换不同的 AI 模型
- 确认网络连接稳定

**Q3: 扩展自动停止？**
- 检查是否到达考试最后一题
- 确认是否有弹窗或验证码阻止操作
- 查看浏览器控制台错误信息

#### 最佳实践建议

1. **使用前测试**: 在正式考试前，先在小测试中验证功能
2. **监控运行**: 保持扩展窗口可见，及时监控运行状态
3. **备用方案**: 准备手动答题作为备选方案
4. **合规使用**: 确保符合考试平台的使用条款

### 开发指南

#### 项目结构说明

```
smart-exam-assistant/
├── manifest.json          # 扩展配置文件
├── content.js             # 页面内容脚本
├── background.js          # 后台服务脚本
├── popup.html            # 设置界面
├── popup.js              # 设置界面逻辑
├── popup.css             # 设置界面样式
├── icons/                # 扩展图标
├── README.md             # 项目文档
└── LICENSE               # 许可证文件
```

#### 开发环境搭建

1. **克隆项目**
```bash
git clone https://github.com/your-username/smart-exam-assistant.git
cd smart-exam-assistant
```

2. **开发模式加载**
   - 打开 `chrome://extensions/`
   - 开启开发者模式
   - 加载项目文件夹

3. **调试工具**
   - **Content Script**: 在目标页面打开 DevTools，查看 Console
   - **Background Script**: 在扩展管理页面点击"背景页"
   - **Popup**: 右键点击扩展图标，选择"检查弹出内容"

#### 代码贡献规范

**代码风格**:
- 使用 2 个空格缩进
- 遵循 JavaScript 标准语法
- 添加必要的注释说明

**提交规范**:
```bash
# 格式：类型(范围): 简短描述
feat(core): 添加题目类型识别功能
fix(parser): 修复多选题解析错误
docs(readme): 更新安装指南
```

#### 测试方法

**单元测试**:
```javascript
// 测试题目解析功能
function testQuestionParsing() {
  const mockElement = createMockQuestion();
  const result = extractQuestionData(mockElement);
  console.assert(result.options.length > 0, '应该解析到选项');
}
```

**集成测试**:
- 在不同考试平台上测试兼容性
- 验证各种题型（单选、多选、判断）
- 测试网络异常情况下的表现

### 部署说明

#### 生产环境配置

**性能优化**:
- 压缩 JavaScript 代码
- 优化 API 调用频率
- 添加错误重试机制

**安全设置**:
- 使用 HTTPS 协议
- 验证 API 响应数据
- 添加请求限流

#### 监控与维护

**日志监控**:
```javascript
// 添加操作日志
console.log(`[ExamAssistant] ${new Date().toISOString()}: ${action}`);
```

**性能指标**:
- 题目识别准确率
- API 响应时间
- 用户操作成功率

### 许可证信息

**开源协议**: MIT License

**版权声明**: 
Copyright (c) 2024 Smart Exam Assistant

**许可证全文**:
```
MIT License

Copyright (c) 2024 Smart Exam Assistant

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## English

### Project Overview

**Project Name**: Smart Exam Assistant

**Project Description**: An intelligent Chrome browser extension that automatically identifies exam questions on web pages, analyzes them using AI models, and automatically selects answers, significantly improving online exam efficiency.

**Key Features**:
- 🎯 **Smart Question Recognition**: Automatically parses question content and options from exam pages
- 🤖 **AI-Powered Answering**: Integrated with OpenAI GPT and Google Gemini models for intelligent analysis
- ⚡ **One-Click Auto-Answering**: Supports continuous automatic answering without manual intervention
- 🎨 **Stealth Mode Design**: Semi-transparent floating window design that doesn't interfere with normal exam operations
- ⌨️ **Keyboard Shortcuts**: Alt+T to quickly start/stop automatic answering
- 🛡️ **Security Protection**: Local API key storage to ensure data security

**Technology Stack**:
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Browser APIs**: Chrome Extension API, Content Script
- **AI Services**: OpenAI GPT API, Google Gemini API
- **Data Storage**: Chrome Storage API

**Applicable Scenarios**:
- Online education platform exams
- Corporate training tests
- Knowledge competition quizzes
- Any web-based standardized testing

### Quick Start Guide

#### System Requirements
- **Browser**: Google Chrome 88+ or Chromium-based browsers
- **Operating System**: Windows 10+, macOS 10.14+, Linux
- **Network**: Stable internet connection (for AI API calls)

#### Installation Steps

1. **Download Project**
```bash
git clone https://github.com/your-username/smart-exam-assistant.git
cd smart-exam-assistant
```

2. **Load Extension to Chrome**
   - Open Chrome browser, go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the `smart-exam-assistant` folder

3. **Verify Installation**
   - Extension icon should appear in browser toolbar
   - Click icon to open settings panel

#### Configuration

1. **API Configuration**
   - Click extension icon to open settings panel
   - Select AI provider (OpenAI or Gemini)
   - Enter corresponding API key
   - Choose model version (recommend gpt-4o-mini or gemini-1.5-flash)

2. **Advanced Settings**
   ```javascript
   // Supported model configuration
   const MODELS = {
     openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
     gemini: ['gemini-1.5-flash', 'gemini-1.5-pro']
   };
   ```

#### Running the Extension

1. **Access Exam Page**
   - Open target exam website (e.g., study.nsu.edu.cn)
   - Ensure question page is fully loaded

2. **Start Assistant**
   - Click extension icon, select "Start Auto-Answer"
   - Or use keyboard shortcut `Alt + T`

3. **Monitor Status**
   - Floating window in bottom right shows current status
   - Green indicates running, red indicates paused

### Detailed Usage Tutorial

#### Core Features Step-by-Step

**Step 1: Question Recognition**
```javascript
// Automatically identify questions on current page
const questionEl = this.findCurrentQuestion();
const data = this.extractQuestionData(questionEl);
```

**Step 2: AI Analysis**
```javascript
// Send question to AI service
const answer = await this.fetchAnswer(data);
```

**Step 3: Auto-Answering**
```javascript
// Automatically select answer
const success = this.selectOption(questionEl, answer);
```

**Step 4: Navigate to Next Question**
```javascript
// Automatically click "Next Question" button
this.goToNextQuestion();
```

#### Code Examples

**Question Parsing Example**:
```javascript
{
  "question": "Which of the following is a JavaScript data type?",
  "options": [
    {"letter": "A", "text": "String"},
    {"letter": "B", "text": "Integer"},
    {"letter": "C", "text": "Float"},
    {"letter": "D", "text": "Char"}
  ],
  "type": "radio"
}
```

**API Call Example**:
```javascript
// Send to OpenAI API
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `Please answer this question: ${question}, options: ${options}`
    }]
  })
});
```

#### FAQ

**Q1: Extension cannot recognize questions?**
- Ensure exam page is fully loaded
- Check if questions use standard HTML structure
- Try refreshing page and restarting

**Q2: AI answers are inaccurate?**
- Verify API key is correctly configured
- Try switching to different AI model
- Confirm stable network connection

**Q3: Extension stops automatically?**
- Check if reached last exam question
- Confirm no popups or captchas blocking operations
- Check browser console for error messages

#### Best Practices

1. **Test Before Use**: Verify functionality in small tests before formal exams
2. **Monitor Operation**: Keep extension window visible to monitor status
3. **Backup Plan**: Prepare manual answering as alternative
4. **Compliant Use**: Ensure compliance with exam platform terms of service

### Development Guide

#### Project Structure

```
smart-exam-assistant/
├── manifest.json          # Extension configuration file
├── content.js             # Page content script
├── background.js          # Background service script
├── popup.html            # Settings interface
├── popup.js              # Settings interface logic
├── popup.css             # Settings interface styles
├── icons/                # Extension icons
├── README.md             # Project documentation
└── LICENSE               # License file
```

#### Development Environment Setup

1. **Clone Project**
```bash
git clone https://github.com/your-username/smart-exam-assistant.git
cd smart-exam-assistant
```

2. **Load in Development Mode**
   - Open `chrome://extensions/`
   - Enable Developer mode
   - Load project folder

3. **Debugging Tools**
   - **Content Script**: Open DevTools on target page, check Console
   - **Background Script**: Click "background page" in extension management page
   - **Popup**: Right-click extension icon, select "Inspect popup"

#### Code Contribution Guidelines

**Code Style**:
- Use 2-space indentation
- Follow JavaScript standard syntax
- Add necessary comments

**Commit Convention**:
```bash
# Format: type(scope): brief description
feat(core): add question type recognition functionality
fix(parser): fix multiple choice parsing error
docs(readme): update installation guide
```

#### Testing Methods

**Unit Testing**:
```javascript
// Test question parsing functionality
function testQuestionParsing() {
  const mockElement = createMockQuestion();
  const result = extractQuestionData(mockElement);
  console.assert(result.options.length > 0, 'Should parse options');
}
```

**Integration Testing**:
- Test compatibility on different exam platforms
- Verify various question types (single choice, multiple choice, true/false)
- Test performance under network exceptions

### Deployment

#### Production Configuration

**Performance Optimization**:
- Compress JavaScript code
- Optimize API call frequency
- Add error retry mechanisms

**Security Settings**:
- Use HTTPS protocol
- Validate API response data
- Add request rate limiting

#### Monitoring and Maintenance

**Log Monitoring**:
```javascript
// Add operation logs
console.log(`[ExamAssistant] ${new Date().toISOString()}: ${action}`);
```

**Performance Metrics**:
- Question recognition accuracy
- API response time
- User operation success rate

### License Information

**Open Source License**: MIT License

**Copyright Notice**: 
Copyright (c) 2024 Smart Exam Assistant

**Full License Text**:
```
MIT License

Copyright (c) 2024 Smart Exam Assistant

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

**⚠️ 重要提醒 / Important Notice**:
- **中文**: 请确保在符合相关考试平台规定的前提下使用本扩展
- **English**: Please ensure compliance with relevant exam platform regulations when using this extension