# AGENTS.md

## Repo Shape
- This repo is a plain Chrome Extension Manifest V3 project. There is no `package.json`, lockfile, CI, test runner, formatter, or typecheck setup.
- Main entrypoints are `manifest.json`, `content.js`, `background.js`, `popup.html`, and `popup.js`.

## Run And Verify
- Load the repo root as an unpacked extension in `chrome://extensions/`.
- After edits, reload the extension from `chrome://extensions/`; there is no build step.
- Debug `content.js` from the target page DevTools, `background.js` from the extension service worker inspector, and `popup.js` from popup DevTools.

## Site Coupling
- `content.js` is tightly coupled to `https://study.nsu.edu.cn/*` and its DOM.
- Extraction and apply logic depend on selectors like `.item-box`, `.qusetion-info`, `.question-type .el-tag__content`, `.el-radio-group`, `.el-checkbox-group`, and `.q-num-box.haveActive`.
- If answering or extraction breaks, inspect the live page structure first before changing AI logic.

## Behavior Gotchas
- Supported providers in code are `openai`, `gemini`, and `qwen`.
- `chrome.storage.sync` keys used by the extension: `provider`, `apiKey`, `modelName`, `debugMode`, `shortAnswerPrompt`, `autoMode`.
- `background.js` caches batch AI results in `chrome.storage.local.ai_cache`; stale cache can affect debugging.
- `autoMode` skips debug verification flow.
- Batch apply only reliably works for question IDs starting with `q-`; fallback `q-split-*` extraction is not fully auto-applicable.

## Shortcuts And Messages
- Shortcuts in `content.js`: `Alt+T` start or stop, `Alt+M` copy current question, `Alt+D` start without debug mode.
- Popup/content/background integration relies on these actions: `GET_AI_ANSWER`, `GET_AI_ANSWERS_BATCH`, `GET_ALL_QUESTIONS`, `START_AREA_SELECT`, `APPLY_ANSWERS_BATCH`, `HIGHLIGHT_QUESTION`.

## Repo Hygiene
- Do not invent `npm` or build/test commands for this repo; manual browser verification is the real workflow.
- `text.md` is gitignored local DOM scratch data.
