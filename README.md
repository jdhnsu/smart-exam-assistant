# Smart Exam Assistant

## Installation
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right.
3. Click "Load unpacked".
4. Select this `smart-exam-assistant` folder.

## Configuration
1. Click the extension icon in the toolbar.
2. Select your AI Provider (OpenAI or Gemini).
3. Enter your API Key.
4. (Optional) Set model name (e.g., `gpt-4o-mini` or `gemini-1.5-flash`).
5. Click "Save Settings".

## Usage
1. Go to the exam page on `study.nsu.edu.cn`.
2. Open the extension popup.
3. Click "Start Auto-Answer".
4. The extension will:
   - Find the current question.
   - Send it to the AI.
   - Click the answer.
   - Click "下一题".

## Files
- `manifest.json`: Configuration.
- `content.js`: Logic for parsing the page and clicking buttons.
- `background.js`: Logic for calling the AI API.
- `popup.html/js`: UI for settings.
