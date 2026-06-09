if (!window.hasExamAssistantRunning) {
  window.hasExamAssistantRunning = true;

  class ExamAssistant {
    constructor() {
      this.isRunning = false;
      this.autoMode = false;
      this.statusPanel = null;
      this._lastCopiedQuestion = null;
      this._skipDebugMode = false; // Flag to temporarily skip debug mode
      this.createStatusPanel();
      this.loadAutoMode();
    }

    createStatusPanel() {
      if (document.getElementById('ai-exam-assistant-status')) return;

      const div = document.createElement('div');
      div.id = 'ai-exam-assistant-status';
      div.style.cssText = 'position:fixed;bottom:20px;right:20px;width:44px;height:44px;border-radius:10px;background:rgba(64,158,255,0.15);display:flex;align-items:center;justify-content:center;z-index:1000005;box-shadow:0 6px 18px rgba(64,158,255,0.12);transition:all .14s ease;';

      // controls container (hidden by default)
      this.controls = document.createElement('div');
      this.controls.style.cssText = 'position:fixed;bottom:76px;right:20px;display:flex;flex-direction:row;gap:8px;padding:8px;border-radius:10px;background:rgba(255,255,255,0.98);box-shadow:0 8px 30px rgba(12,24,40,0.06);z-index:1000006;align-items:center;';
      this.controls.style.display = 'none';

      // create buttons
      const makeBtn = (txt) => {
        const b = document.createElement('button');
        b.textContent = txt;
        b.style.cssText = 'padding:6px 8px;border-radius:8px;border:none;background:linear-gradient(180deg,#fff,#f3f6fb);cursor:pointer;font-weight:600;box-shadow:0 2px 8px rgba(16,24,40,0.04);';
        return b;
      };

      this.btnCopy = makeBtn('Copy');
      this.btnStart = makeBtn('Start');
      this.btnPause = makeBtn('Stop');
      this.btnNext = makeBtn('Next');
      this.btnAuto = makeBtn('Auto');

      this.controls.appendChild(this.btnCopy);
      this.controls.appendChild(this.btnStart);
      this.controls.appendChild(this.btnPause);
      this.controls.appendChild(this.btnNext);
      this.controls.appendChild(this.btnAuto);

      // small status dot inside div
      this.statusPanel = document.createElement('div');
      this.statusPanel.style.cssText = 'width:12px;height:12px;border-radius:50%;background:rgba(64,158,255,0.15);transition:all .14s ease;';
      div.appendChild(this.statusPanel);

      document.body.appendChild(this.controls);
      document.body.appendChild(div);

      // show/hide helpers
      const showControls = (e) => {
        if (this._hideControlsTimer) { clearTimeout(this._hideControlsTimer); this._hideControlsTimer = null; }
        this.controls.style.display = 'flex';
        div.style.background = 'rgba(64, 158, 255, 0.4)';
      };

      const hideControls = () => {
          this._hideControlsTimer = setTimeout(() => {
              this.controls.style.display = 'none';
              div.style.background = 'rgba(64, 158, 255, 0.15)';
              div.style.boxShadow = '0 0 6px rgba(64, 158, 255, 0.3)';
          }, 300); // 300ms delay before hiding
      };

      div.addEventListener('mouseenter', showControls);
      div.addEventListener('mouseleave', hideControls);

      // Keep controls visible when hovering over them
      this.controls.addEventListener('mouseenter', () => {
          if (this._hideControlsTimer) {
              clearTimeout(this._hideControlsTimer);
              this._hideControlsTimer = null;
          }
      });

      this.controls.addEventListener('mouseleave', hideControls);

      // Button hover effects
      [this.btnCopy, this.btnStart, this.btnPause, this.btnNext, this.btnAuto].forEach(btn => {
          if (!btn) return;
          btn.addEventListener('mouseenter', () => {
              btn.style.transform = 'scale(1.1)';
              btn.style.opacity = '1';
          });
          btn.addEventListener('mouseleave', () => {
              btn.style.transform = 'scale(1)';
              btn.style.opacity = '0.9';
          });
      });

      this.btnCopy.onclick = (e) => { e.stopPropagation(); this.copyQuestion(); };
      this.btnStart.onclick = (e) => { e.stopPropagation(); this.start(); };
      this.btnPause.onclick = (e) => { e.stopPropagation(); this.stop(); };
      this.btnNext.onclick = (e) => { e.stopPropagation(); this.goToNextQuestion(); };
      this.btnAuto.onclick = (e) => { e.stopPropagation(); this.toggleAutoMode(); };
      this.updateAutoButtonState();
    }

    loadAutoMode() {
      chrome.storage.sync.get(['autoMode'], (result) => {
        this.autoMode = !!result.autoMode;
        this.updateAutoButtonState();
      });
    }

    updateAutoButtonState() {
      if (!this.btnAuto) return;

      this.btnAuto.textContent = this.autoMode ? 'Auto On' : 'Auto Off';
      this.btnAuto.style.opacity = '0.95';

      if (this.autoMode) {
        this.btnAuto.style.background = 'linear-gradient(180deg,#67c23a,#4ea72e)';
        this.btnAuto.style.color = '#fff';
        this.btnAuto.style.boxShadow = '0 4px 12px rgba(103,194,58,0.28)';
      } else {
        this.btnAuto.style.background = 'linear-gradient(180deg,#fff,#f3f6fb)';
        this.btnAuto.style.color = '#303133';
        this.btnAuto.style.boxShadow = '0 2px 8px rgba(16,24,40,0.04)';
      }
    }

    toggleAutoMode() {
      const nextValue = !this.autoMode;
      chrome.storage.sync.set({ autoMode: nextValue }, () => {
        this.autoMode = nextValue;
        this.updateAutoButtonState();
        this.updateStatus(this.autoMode ? 'Auto mode enabled' : 'Auto mode disabled', this.autoMode ? '#67C23A' : '#909399');
      });
    }

    updateStatus(text, color = 'white') {
      // Update dot color based on status
      if (this.statusPanel) {
        if (text.includes('Error') || text.includes('failed') || text.includes('Could not')) {
          this.statusPanel.style.background = 'rgba(245, 108, 108, 0.3)'; // Red
          this.statusPanel.style.boxShadow = '0 0 8px rgba(245, 108, 108, 0.5)';
        } else if (text.includes('copied') || text.includes('Answered') || text.includes('filled')) {
          this.statusPanel.style.background = 'rgba(103, 194, 58, 0.3)'; // Green
          this.statusPanel.style.boxShadow = '0 0 8px rgba(103, 194, 58, 0.5)';
        } else if (text.includes('Thinking') || text.includes('Started')) {
          this.statusPanel.style.background = 'rgba(230, 162, 60, 0.3)'; // Orange
          this.statusPanel.style.boxShadow = '0 0 8px rgba(230, 162, 60, 0.5)';
        } else {
          this.statusPanel.style.background = 'rgba(64, 158, 255, 0.15)'; // Blue (default)
          this.statusPanel.style.boxShadow = '0 0 6px rgba(64, 158, 255, 0.3)';
        }
      }
      console.log(`[ExamAssistant] ${text}`);
    }

    async copyQuestion() {
      try {
        // Find current question
        const questionEl = this.findCurrentQuestion();
        if (!questionEl) {
          this.updateStatus("No question found to copy", "red");
          return;
        }

        // Extract question text (without question number)
        const textEl = questionEl.querySelector('.qusetion-info .info-item .value');
        if (!textEl) {
          this.updateStatus("Could not extract question text", "red");
          return;
        }

        // Get the text content, cleaned up
        const questionText = textEl.innerText.replace(/\s+/g, ' ').trim();

        // Copy to clipboard
        await navigator.clipboard.writeText(questionText);

        this.updateStatus("Question copied!", "#67C23A");

        // Reset status after 2 seconds
        setTimeout(() => {
          this.updateStatus("AI Ready", "white");
        }, 2000);

      } catch (err) {
        console.error("Copy failed:", err);
        this.updateStatus("Copy failed: " + err.message, "red");
      }
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this._skipDebugMode = false; // Reset flag when starting normally
      this.updateStatus(this.autoMode ? "Started (Auto)" : "Started", "#409EFF");

      if (this.btnStart) {
          this.btnStart.style.display = 'none';
          this.btnPause.style.display = 'flex';
      }

      this.processLoop();
    }

    startWithoutDebug() {
      if (this.isRunning) return;
      this.isRunning = true;
      this._skipDebugMode = true; // Set flag to skip debug mode
      this.updateStatus(this.autoMode ? "Started (Auto, Debug Disabled)" : "Started (Debug Mode Disabled)", "#409EFF");

      if (this.btnStart) {
          this.btnStart.style.display = 'none';
          this.btnPause.style.display = 'flex';
      }

      this.processLoop();
    }

    stop() {
      this.isRunning = false;
      this._skipDebugMode = false; // Reset flag when stopping
      this.updateStatus("Paused", "#F56C6C");

      if (this.btnStart) {
          this.btnStart.style.display = 'flex';
          this.btnPause.style.display = 'none';
      }
    }

    async processLoop() {
      if (!this.isRunning) return;

      // 1. Find current question
      const questionEl = this.findCurrentQuestion();
      if (!questionEl) {
        this.updateStatus("No visible question found. Waiting...", "yellow");
        setTimeout(() => this.processLoop(), 2000);
        return;
      }

      // Scroll to question to ensure it's in view
      questionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // 2. Check if already answered - REMOVED PRE-CHECK
      // We now force a re-fetch every time "Start" is clicked, 
      // even if the question appears answered.
      
      // 3. Extract Data
      this.updateStatus("Extracting question data...");
      const data = this.extractQuestionData(questionEl);
      if (!data) {
        this.updateStatus("Failed to extract question data", "red");
        this.stop(); // Stop if we can't read the question
        return;
      }

      const currentSignature = this.getQuestionSignature(questionEl, data);

      // For short-answer questions, check if input element exists
      if (data.type === 'short-answer' && !data.inputElement) {
        this.updateStatus("No input field found for short answer", "red");
        this.stop();
        return;
      }

      // For choice questions, check if options exist
      if (data.type !== 'short-answer' && !data.options.length) {
        this.updateStatus("Failed to extract question options", "red");
        this.stop();
        return;
      }

      // DEBUG STEP 1: Verify Question
      // User requested to REMOVE the confirmation phase for Question Verification
      // So we skip showQuestionVerification call entirely or make it auto-proceed?
      // "取消 Debug: Verify Question 的 confirm 的确认阶段" -> Remove the confirm step.
      // We will SKIP this modal and proceed directly to AI.
      /* 
      if (await this.isDebugMode()) {
        const confirmed = await this.showQuestionVerification(data);
        if (!confirmed) {
          this.updateStatus("Skipped by user (Debug Mode)", "orange");
          this.stop();
          return;
        }
      }
      */

      // 4. Get Answer from AI
      try {
        this.updateStatus("Thinking (AI)...", "#E6A23C");
        const answer = await this.fetchAnswer(data);
        
        if (!answer) {
          throw new Error("AI returned empty answer");
        }

        // DEBUG STEP 2: Verify Answer
        if (await this.isDebugMode()) {
            const confirmed = await this.showAnswerVerification(data, answer);
            if (!confirmed) {
                this.updateStatus("Stopped by user after AI answer", "orange");
                this.stop();
                return;
            }
        }

        this.updateStatus(`AI chose: ${answer}`, "#409EFF");

        // 5. Select Option or Fill Answer
        let success;
        if (data.type === 'short-answer') {
          success = this.fillAnswer(data.inputElement, answer);
        } else {
          success = this.selectOption(data, answer);
        }

        if (success) {
          if (this.autoMode) {
            const msg = data.type === 'short-answer' ? "Answer filled. Auto: waiting before next..." : "Answered. Auto: waiting before next...";
            this.updateStatus(msg, "#67C23A");
            await this.continueAutoFlow(currentSignature);
          } else {
            const msg = data.type === 'short-answer' ? "Answer filled. Click Next manually." : "Answered. Click Next manually.";
            this.updateStatus(msg, "#67C23A");
            // Stop automatically after answering one question
            this.stop();
          }
        } else {
          const errorMsg = data.type === 'short-answer' ? "Could not fill answer" : `Could not select option ${answer}`;
          this.updateStatus(errorMsg, "red");
          this.stop();
        }

      } catch (err) {
        this.updateStatus(`Error: ${err.message || err}`, "red");
        this.stop();
      }
    }

    async continueAutoFlow(previousSignature) {
      if (!this.isRunning) return;

      await this.sleep(this.getAutoNextDelay());
      if (!this.isRunning) return;

      const moved = this.goToNextQuestion(true);
      if (!moved) {
        this.updateStatus("Auto stopped: could not find next question button", "red");
        this.stop();
        return;
      }

      const changed = await this.waitForQuestionChange(previousSignature);
      if (!this.isRunning) return;

      if (!changed) {
        this.updateStatus("Auto stopped: next question did not load", "red");
        this.stop();
        return;
      }

      this.updateStatus("Auto: question loaded, continuing...", "#67C23A");
      await this.sleep(this.getAutoSettleDelay());
      if (!this.isRunning) return;
      setTimeout(() => this.processLoop(), 0);
    }

    findCurrentQuestion() {
      // Filter for visible questions only
      const questions = Array.from(document.querySelectorAll('.item-box'));
      const currentQuestion = questions.find(q => {
        const style = window.getComputedStyle(q);
        return style.display !== 'none' && style.visibility !== 'hidden' && q.offsetParent !== null;
      });

      // Auto-copy for short answer questions
      if (currentQuestion) {
        const typeTag = currentQuestion.querySelector('.question-type .el-tag__content');
        const typeText = typeTag ? typeTag.innerText.trim() : '';
        const isShortAnswer = typeText.includes('问答题') || typeText.includes('填空题') || typeText.includes('简答题');

        if (isShortAnswer && !this._lastCopiedQuestion) {
          // Auto-copy the question to clipboard
          const textEl = currentQuestion.querySelector('.qusetion-info .info-item .value');
          if (textEl) {
            const questionText = textEl.innerText.replace(/\s+/g, ' ').trim();
            navigator.clipboard.writeText(questionText).then(() => {
              console.log('[ExamAssistant] Auto-copied short answer question to clipboard');
              this._lastCopiedQuestion = questionText;
              // Flash green briefly
              this.statusPanel.style.background = 'rgba(103, 194, 58, 0.3)';
              this.statusPanel.style.boxShadow = '0 0 8px rgba(103, 194, 58, 0.5)';
              setTimeout(() => {
                this.statusPanel.style.background = 'rgba(64, 158, 255, 0.15)';
                this.statusPanel.style.boxShadow = '0 0 6px rgba(64, 158, 255, 0.3)';
              }, 1000);
            }).catch(err => {
              console.error('[ExamAssistant] Auto-copy failed:', err);
            });
          }
        } else if (!isShortAnswer) {
          // Reset for non-short-answer questions
          this._lastCopiedQuestion = null;
        }
      }

      return currentQuestion;
    }

    isQuestionAnswered(questionEl) {
      // Check radio or checkbox
      return !!questionEl.querySelector('.el-radio.is-checked, .el-checkbox.is-checked');
    }

    extractQuestionData(questionEl) {
      try {
        // Extract Text
        const textEl = questionEl.querySelector('.qusetion-info .info-item .value');
        const questionText = textEl ? textEl.innerText.replace(/\s+/g, ' ').trim() : "Unknown Question";

        // Detect question type from the type tag
        const typeTag = questionEl.querySelector('.question-type .el-tag__content');
        const typeText = typeTag ? typeTag.innerText.trim() : '';

        // Check if it's a short answer question (问答题)
        const isShortAnswer = typeText.includes('问答题') || typeText.includes('填空题') || typeText.includes('简答题');

        if (isShortAnswer) {
          // For short answer questions, find the input field
          const inputEl = questionEl.querySelector('.el-input__inner');
          return {
            question: questionText,
            options: [],
            type: 'short-answer',
            inputElement: inputEl
          };
        }

        // Detect type for multiple choice questions
        const isCheckbox = !!questionEl.querySelector('.el-checkbox-group');

        // Extract Options (support both radio and checkbox)
        const options = [];
        const optionInputMap = new Map(); // Map letter to input element

        // Select both types of containers
        const optionEls = questionEl.querySelectorAll('.el-radio-group .choices, .el-checkbox-group .choices');

        optionEls.forEach(opt => {
          // Support both radio and checkbox inputs
          const input = opt.querySelector('input.el-radio__original, input.el-checkbox__original');
          const labelText = opt.querySelector('.choices-html');
          const letterDiv = opt.querySelector('.choices-label');

          let letter = letterDiv ? letterDiv.innerText.replace('.', '').trim() : '';

          const text = labelText ? labelText.innerText.trim() : '';

          if (letter && text && input) {
            options.push({ letter, text });
            optionInputMap.set(letter, input); // Store mapping
          }
        });

        return {
          question: questionText,
          options: options,
          type: isCheckbox ? 'checkbox' : 'radio',
          optionInputMap: optionInputMap // Include the map
        };
      } catch (e) {
        console.error("Extraction error", e);
        return null;
      }
    }

    // Extract all questions on the page (or within .item-box containers)
    extractAllQuestions() {
      try {
        const containers = Array.from(document.querySelectorAll('.item-box'));

        // If the site already exposes per-question containers, use them and try to group passages
        if (containers.length > 1) {
          // Try to detect passage markers near questions (e.g., elements containing '阅读' / '根据短文')
          const passageKeywords = ['阅读下列', '根据短文', '根据短文回答', '阅读短文', '阅读下面短文', '相关阅读'];

          // Find candidate passage elements
          const passageEls = Array.from(document.querySelectorAll('p, div, section')).filter(el => {
            const txt = (el.innerText || '').trim();
            if (!txt) return false;
            if (txt.length > 300) return true;
            for (const k of passageKeywords) if (txt.includes(k)) return true;
            return false;
          });

          // Build a map of which container belongs to which passage (if any)
          const groups = {};
          let setCounter = 0;

          containers.forEach((el, idx) => {
            const q = this.extractQuestionData(el);
            // Try to find a passage element that appears before this container in DOM order
            const passage = passageEls.find(p => p.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
            const setId = passage ? `set-${passageEls.indexOf(passage)}` : null;
            const passageText = passage ? (passage.innerText || '').trim().slice(0, 2000) : null;

            if (setId) groups[setId] = passageText;

            // Use question data where possible
            const questionText = q ? q.question : (el.innerText || '').slice(0, 400);
            const opts = q ? q.options : [];
            groups[idx] = groups[idx] || null;

            containers[idx].dataset._ea_id = `q-${idx}`;

            containers[idx]._ea_data = {
              id: `q-${idx}`,
              index: idx,
              question: questionText,
              type: q ? q.type : 'unknown',
              options: opts,
              applySupported: true,
              setId: setId,
              passageText: passageText
            };
          });

          // Return array of extracted data
          return containers.map((el) => el._ea_data);
        }

        // Fallback: if only one big container or none, try split by numbered headings and detect passages
        const root = containers[0] || document.body;
        const text = root.innerText || '';

        // Attempt to detect a passage header like '阅读下列短文' and split accordingly
        const passageHeaderMatch = text.match(/(阅读下列[\s\S]{0,40}|根据短文[\s\S]{0,40}|阅读下面短文[\s\S]{0,40})/i);
        let passageText = null;
        if (passageHeaderMatch) {
          // Heuristic: take the paragraph following header as passage (first 800 chars)
          const after = text.slice(passageHeaderMatch.index + passageHeaderMatch[0].length).trim();
          passageText = after.slice(0, 1200);
        }

        // Split by lines that start with number + dot/)、． etc.
        const parts = text.split(/\n(?=\s*\d+[\.|\)|\uff0e]\s+)/);

        const questions = parts.map((part, idx) => {
          const lines = part.split('\n').map(l => l.trim()).filter(Boolean);
          const opts = [];
          let stemLines = [];

          lines.forEach(line => {
            const m = line.match(/^([A-Z])[\.\)．:]\s*(.+)$/);
            if (m) {
              opts.push({ letter: m[1], text: m[2] });
            } else {
              stemLines.push(line);
            }
          });

          const isComp = !!passageText && idx > 0; // if passage exists, assume following parts are questions

          return {
            id: `q-split-${idx}`,
            index: idx,
            question: stemLines.join(' ').slice(0, 2000),
            type: opts.length ? (opts.length > 1 ? 'radio' : 'radio') : (isComp ? 'comprehension' : 'short-answer'),
            options: opts,
            applySupported: false,
            setId: passageText ? `passage-0` : null,
            passageText: passageText
          };
        });

        return questions;
      } catch (e) {
        console.error('[ExamAssistant] extractAllQuestions failed', e);
        return [];
      }
    }

    async isDebugMode() {
        // If skipDebugMode flag is set, return false to skip debug mode
        if (this._skipDebugMode || this.autoMode) {
          return false;
        }

        return new Promise((resolve) => {
          chrome.storage.sync.get(['debugMode'], (result) => {
            resolve(!!result.debugMode);
          });
        });
    }

    async showQuestionVerification(data) {
        return new Promise((resolve) => {
            this.createModal('Debug: Verify Question', data, null, resolve);
        });
    }

    async showAnswerVerification(data, answer) {
        return new Promise((resolve) => {
            this.createModal('Debug: Verify Answer', data, answer, resolve);
        });
    }

    async createModal(title, data, answer, resolve) {
      const existing = document.getElementById('ai-exam-debug-modal');
      if (existing) existing.remove();
      // Removed overlay logic for transparent/draggable mode

      // Load saved position
      const pos = await new Promise(r => chrome.storage.local.get(['debugModalPos'], res => r(res.debugModalPos || { top: '15%', right: '20px', left: 'auto' })));

      const modal = document.createElement('div');
      modal.id = 'ai-exam-debug-modal';
      modal.style.cssText = `
        position: fixed; 
        top: ${pos.top}; 
        left: ${pos.left};
        right: ${pos.right};
        width: 350px;
        background: rgba(255, 255, 255, 0.95); 
        padding: 0; 
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 1000000; 
        max-height: 70vh; 
        display: flex;
        flex-direction: column;
        color: #333; 
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px; 
        border: 1px solid rgba(0,0,0,0.1);
        backdrop-filter: blur(10px);
        transform: translateY(0); 
        transition: opacity 0.3s;
      `;

      const optionsHtml = data.options.map(o => {
          // Highlight selected answer
          const isSelected = answer && answer.includes(o.letter);
          const bg = isSelected ? '#f0f9eb' : 'transparent';
          const border = isSelected ? '1px solid #67c23a' : '1px solid transparent';
          const color = isSelected ? '#67c23a' : '#606266';
          return `<div style="background:${bg}; border:${border}; color:${color}; padding: 6px; margin-bottom: 4px; border-radius: 6px; display:flex; gap:6px;">
            <span style="font-weight:bold;">${o.letter}.</span>
            <span>${o.text}</span>
          </div>`
      }).join('');
      
      const answerHtml = answer ? 
        `<div style="margin: 10px 0; padding: 8px 12px; background: #ecf5ff; border-radius: 6px; color: #409eff; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-weight: bold;">AI Suggestion:</span> 
            <span style="font-size: 1.4em; font-weight: bold;">${answer}</span>
         </div>` : '';

      modal.innerHTML = `
        <div id="debug-header" style="padding: 12px 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; cursor: move; background: rgba(248, 249, 250, 0.8); border-radius: 12px 12px 0 0; user-select: none;">
            <div style="display:flex; align-items:center; gap:6px;">
                <span style="width: 8px; height: 8px; background: #409eff; border-radius: 50%;"></span>
                <h3 style="margin:0; font-size:13px; font-weight:600;">${title}</h3>
            </div>
            <div style="font-size: 16px; color: #909399; cursor: pointer; padding: 0 4px;" id="debug-close">×</div>
        </div>
        
        <div style="padding: 15px; overflow-y: auto; max-height: calc(70vh - 100px);">
            <div style="background:#f5f7fa; padding:10px; margin-bottom:10px; border-radius:6px; line-height:1.4;">
            ${data.question}
            </div>
            ${answerHtml}
            <div style="margin-bottom:15px;">
            ${optionsHtml}
            </div>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button id="debug-cancel" style="padding:6px 12px; background:#f56c6c; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px;">Stop</button>
            <button id="debug-confirm" style="padding:6px 12px; background:#409eff; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px;">
                ${answer ? 'Apply' : 'Confirm'}
            </button>
            </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Drag Logic
      const header = modal.querySelector('#debug-header');
      let isDragging = false;
      let startX, startY, initialLeft, initialTop;

      header.onmousedown = (e) => {
          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          const rect = modal.getBoundingClientRect();
          initialLeft = rect.left;
          initialTop = rect.top;
          modal.style.right = 'auto'; // Disable right positioning once dragging starts
          modal.style.width = rect.width + 'px'; // Fix width
      };

      document.onmousemove = (e) => {
          if (!isDragging) return;
          e.preventDefault();
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          
          let newLeft = initialLeft + dx;
          let newTop = initialTop + dy;

          // Boundary Check
          const maxLeft = window.innerWidth - modal.offsetWidth;
          const maxTop = window.innerHeight - modal.offsetHeight;

          if (newLeft < 0) newLeft = 0;
          if (newTop < 0) newTop = 0;
          if (newLeft > maxLeft) newLeft = maxLeft;
          if (newTop > maxTop) newTop = maxTop;

          modal.style.left = newLeft + 'px';
          modal.style.top = newTop + 'px';
      };

      document.onmouseup = () => {
          if (isDragging) {
              isDragging = false;
              // Save Position
              chrome.storage.local.set({ 
                  debugModalPos: { 
                      top: modal.style.top, 
                      left: modal.style.left, 
                      right: 'auto' 
                  } 
              });
          }
      };

      // Add global click listener for "click outside to hide"
      // We use a transparent overlay approach for this specific modal to allow interactions outside?
      // User requested "Click non-popup area to quickly hide".
      // Since we removed the overlay to allow background interaction, we need a document click listener.
      
      const outsideClickListener = (e) => {
          if (modal && !modal.contains(e.target)) {
              // Clicked outside
              cleanup();
              resolve(false);
          }
      };
      
      const keyDownListener = (e) => {
          if (e.altKey && e.key.toLowerCase() === 't') {
              // Alt+T pressed inside modal -> Close modal (hide)
              cleanup();
              resolve(false); 
              // Note: The global listener will also toggle start/stop, 
              // but since we resolve(false), the processLoop will likely stop anyway.
          }
      };

      // Delay adding the listener to avoid triggering it immediately on the click that opened it
      setTimeout(() => {
          document.addEventListener('click', outsideClickListener);
          document.addEventListener('keydown', keyDownListener);
      }, 100);

      const cleanup = () => {
        if (document.body.contains(modal)) modal.remove();
        document.removeEventListener('click', outsideClickListener);
        document.removeEventListener('keydown', keyDownListener);
        document.onmousemove = null;
        document.onmouseup = null;
      };

      document.getElementById('debug-confirm').onclick = () => {
        cleanup();
        resolve(true);
      };

      // Stop button
      document.getElementById('debug-cancel').onclick = () => {
        cleanup();
        resolve(false); 
      };

      // Close 'x' button (treat as stop/cancel)
      document.getElementById('debug-close').onclick = () => {
        cleanup();
        resolve(false);
      };
    }

    fetchAnswer(data) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: "GET_AI_ANSWER",
          data: data
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError.message);
            return;
          }
          if (response && response.answer) {
            resolve(response.answer);
          } else {
            reject(response ? response.error : "Unknown error");
          }
        });
      });
    }

    selectOption(data, answer) {
      // Answer can be "A" or "AC"
      const letters = answer.split('');
      let successCount = 0;

      // Use the optionInputMap if available, otherwise fall back to querySelector
      if (data.optionInputMap && data.optionInputMap.size > 0) {
        letters.forEach(letter => {
          const input = data.optionInputMap.get(letter);
          if (input) {
            const clickableLabel = input.closest('.el-radio, .el-checkbox');
            if (clickableLabel) {
              const isChecked = clickableLabel.classList.contains('is-checked');

              if (!isChecked) {
                // Try multiple click strategies
                clickableLabel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                clickableLabel.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                clickableLabel.click();

                // Also try clicking the input directly
                input.click();

                successCount++;
              } else {
                successCount++; // Already correct
              }
            }
          }
        });
      } else {
        // Fallback: try to find inputs by value (old method)
        console.warn('[ExamAssistant] optionInputMap not available, using fallback method');
        const questionEl = this.findCurrentQuestion();
        if (!questionEl) return false;

        const inputs = Array.from(questionEl.querySelectorAll('input.el-radio__original, input.el-checkbox__original'));

        letters.forEach(letter => {
          const targetInput = inputs.find(i => i.value === letter);
          if (targetInput) {
            const clickableLabel = targetInput.closest('.el-radio, .el-checkbox');
            const isChecked = clickableLabel && clickableLabel.classList.contains('is-checked');

            if (clickableLabel && !isChecked) {
              clickableLabel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
              clickableLabel.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
              clickableLabel.click();
              successCount++;
            } else if (isChecked) {
              successCount++; // Already correct
            }
          }
        });
      }

      return successCount > 0;
    }

    highlightQuestionById(id) {
      try {
        const el = document.querySelector(`[data-_ea_id="${id}"]`);
        let target = el;
        if (!target) {
          // Fallback: try to find by text snippet
          const qs = Array.from(document.querySelectorAll('.item-box'));
          const q = qs.find(node => (node.innerText || '').includes(id.replace('q-split-', '').slice(0, 10)));
          target = q || null;
        }

        if (!target) return { success: false, error: 'element not found' };

        target.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Add highlight style
        target.classList.add('ea-temp-highlight');
        // Ensure style exists
        if (!document.getElementById('ea-highlight-style')) {
          const s = document.createElement('style');
          s.id = 'ea-highlight-style';
          s.innerHTML = `
            .ea-temp-highlight {
              transition: box-shadow 0.2s ease, background-color 0.2s ease;
              box-shadow: 0 0 0 3px rgba(64,158,255,0.25) inset, 0 6px 18px rgba(64,158,255,0.12);
              background-color: rgba(64,158,255,0.04);
              border-radius: 6px;
            }
          `;
          document.head.appendChild(s);
        }

        // Remove after 3.5s
        setTimeout(() => {
          try { target.classList.remove('ea-temp-highlight'); } catch (e) {}
        }, 3500);

        return { success: true };
      } catch (err) {
        return { success: false, error: err && err.message };
      }
    }

    fillAnswer(inputElement, answer) {
      if (!inputElement) return false;

      try {
        // Focus the input element
        inputElement.focus();

        // Set the value
        inputElement.value = answer;

        // Trigger input event to notify Vue/framework
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));

        // Also try setting it via Vue if available
        if (inputElement.__v_model) {
          inputElement.__v_model.value = answer;
        }

        return true;
      } catch (e) {
        console.error("Failed to fill answer:", e);
        return false;
      }
    }

    getQuestionSignature(questionEl, data = null) {
      const activeNum = document.querySelector('.q-num-box.haveActive');
      const activeIndex = activeNum ? activeNum.innerText.trim() : '';

      if (!questionEl) {
        return `active:${activeIndex}|empty`;
      }

      const questionData = data || this.extractQuestionData(questionEl);
      const questionText = questionData && questionData.question
        ? questionData.question
        : ((questionEl.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300));
      const type = questionData && questionData.type ? questionData.type : '';

      return `active:${activeIndex}|type:${type}|text:${questionText}`;
    }

    waitForQuestionChange(previousSignature, timeoutMs = 5000, intervalMs = 150) {
      return new Promise((resolve) => {
        const startTime = Date.now();

        const poll = () => {
          if (!this.isRunning) {
            resolve(false);
            return;
          }

          const questionEl = this.findCurrentQuestion();
          const currentSignature = this.getQuestionSignature(questionEl);
          if (questionEl && currentSignature !== previousSignature) {
            resolve(true);
            return;
          }

          if (Date.now() - startTime >= timeoutMs) {
            resolve(false);
            return;
          }

          setTimeout(poll, intervalMs);
        };

        poll();
      });
    }

    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getAutoNextDelay() {
      return this.getRandomInt(800, 1500);
    }

    getAutoSettleDelay() {
      return this.getRandomInt(250, 450);
    }

    goToNextQuestion(isAutoFlow = false) {
      this.updateStatus(isAutoFlow ? "Auto: clicking next..." : "Clicking Next...", "#909399");
      
      // Strategy 1: Find "下一题" text
      const spans = Array.from(document.querySelectorAll('span, div, button, a'));
      const nextBtnText = spans.find(el => {
        const text = el.innerText.trim();
        return (text === "下一题" || text === "下一页") && 
               el.offsetParent !== null && 
               el.tagName !== 'SCRIPT';
      });

      if (nextBtnText) {
        // Try clicking the element itself or its parents
        if (this.clickElementOrParent(nextBtnText)) return true;
      }

      // Strategy 2: Sidebar numbers (.q-num-box)
      console.log("Next button not found via text. Trying sidebar...");
      const activeNum = document.querySelector('.q-num-box.haveActive');
      if (activeNum) {
        // Try next sibling
        const nextNum = activeNum.nextElementSibling;
        if (nextNum && nextNum.classList.contains('q-num-box')) {
          this.updateStatus(isAutoFlow ? "Auto: using sidebar navigation..." : "Using sidebar navigation...", "#909399");
          nextNum.click();
          return true;
        }
      }
      
      this.updateStatus("Could not find next question button", "red");
      return false;
    }

    clickElementOrParent(el, depth = 3) {
      let current = el;
      for (let i = 0; i < depth; i++) {
        if (current) {
          current.click();
          // Also dispatch mouse events just in case
          current.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          current.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          
          // If we clicked a button or something that looks clickable, we assume success
          // But actually we can't know for sure without checking URL change.
          // For now, let's just click all the way up a bit.
          current = current.parentElement;
        } else {
          return false;
        }
      }
      return true;
    }
  }

  const assistant = new ExamAssistant();

  // Global Keyboard Shortcut: Alt+T to toggle/start
  document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 't') {
          console.log("[ExamAssistant] Shortcut Alt+T triggered");
          if (assistant.isRunning) {
              assistant.stop();
          } else {
              assistant.start();
          }
      } else if (e.altKey && e.key.toLowerCase() === 'm') {
          console.log("[ExamAssistant] Shortcut Alt+M triggered - Copy question");
          e.preventDefault();
          assistant.copyQuestion();
      } else if (e.altKey && e.key.toLowerCase() === 'd') {
          console.log("[ExamAssistant] Shortcut Alt+D triggered - Start without Debug Mode");
          e.preventDefault();
          if (assistant.isRunning) {
              assistant.stop();
          } else {
              assistant.startWithoutDebug();
          }
      }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_ANSWERING") {
      assistant.start();
    } else if (request.action === "STOP_ANSWERING") {
      assistant.stop();
    } else if (request.action === 'GET_ALL_QUESTIONS') {
      try {
        const qs = assistant.extractAllQuestions();
        sendResponse({ questions: qs });
      } catch (e) {
        sendResponse({ questions: [], error: e && e.message });
      }
    } else if (request.action === 'APPLY_ANSWERS_BATCH') {
      const answers = request.data || [];
      const containers = Array.from(document.querySelectorAll('.item-box'));

      const results = answers.map(item => {
        try {
          // Only support q-<idx> apply mode
          if (!item.id || !item.id.startsWith('q-')) {
            return { id: item.id, success: false, error: 'apply not supported for this id' };
          }
          const idx = parseInt(item.id.replace('q-', ''), 10);
          const container = containers[idx];
          if (!container) return { id: item.id, success: false, error: 'container not found' };

          // Re-extract question data for this container to get input map or input element
          const qdata = assistant.extractQuestionData(container);
          if (!qdata) return { id: item.id, success: false, error: 'could not extract question' };

          let ok = false;
          if (qdata.type === 'short-answer' && qdata.inputElement) {
            ok = assistant.fillAnswer(qdata.inputElement, item.answer || '');
          } else if (qdata.options && qdata.options.length) {
            ok = assistant.selectOption(qdata, (item.answer || '').toString());
          } else {
            return { id: item.id, success: false, error: 'no fillable element' };
          }

          return { id: item.id, success: !!ok };
        } catch (err) {
          return { id: item.id, success: false, error: err && err.message };
        }
      });

      sendResponse({ results });
    } else if (request.action === 'HIGHLIGHT_QUESTION') {
      try {
        const id = request.id;
        const res = assistant.highlightQuestionById(id);
        sendResponse(res);
      } catch (e) {
        sendResponse({ success: false, error: e && e.message });
      }
    } else if (request.action === 'START_AREA_SELECT') {
      try {
        assistant.startAreaSelection(sendResponse);
        return true;
      } catch (e) {
        sendResponse({ error: e && e.message });
      }
    }
  });

  // Selection-based quick action: show floating icon after text selection
  (function setupSelectionIcon() {
    let icon = null;

    function removeIcon() {
      if (icon && icon.parentNode) icon.parentNode.removeChild(icon);
      icon = null;
    }

    function onMouseUp(e) {
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          removeIcon();
          return;
        }
        const text = sel.toString().trim();
        if (!text || text.length < 6) {
          removeIcon();
          return;
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        removeIcon();
        icon = document.createElement('div');
        icon.id = 'ea-selection-icon';
        icon.style.cssText = `position:fixed; left:${rect.right - 28}px; top:${Math.max(8, rect.top - 36)}px; width:28px; height:28px; background:#409EFF; color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; z-index:1000005; cursor:pointer; box-shadow:0 6px 18px rgba(64,158,255,0.18);`;
        icon.title = 'Search question (AI)';
        icon.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM10 14a4 4 0 110-8 4 4 0 010 8z"/></svg>';

        document.body.appendChild(icon);

        // click icon => extract selection and show modal
        icon.onclick = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          const selRange = range.cloneRange();
          const data = assistant.extractFromSelection ? assistant.extractFromSelection(selRange) : null;
          removeIcon();
          if (data && data.length) {
            assistant.showSelectionResultsModal(data);
          } else {
            // fallback: just open modal with raw text
            assistant.showSelectionResultsModal([{ id: 'sel-raw-0', index: 0, question: selRange.toString().trim(), type: 'unknown', options: [], applySupported: false }]);
          }
        };

        // remove icon if clicking elsewhere
        setTimeout(() => {
          const onDocClick = (ev) => { if (!icon.contains(ev.target)) removeIcon(); };
          document.addEventListener('click', onDocClick, { once: true });
        }, 50);
      }, 10);
    }

    document.addEventListener('mouseup', onMouseUp);
  })();

  // Helper: extract questions from a Range (used by selection icon)
  ExamAssistant.prototype.extractFromSelection = function(range) {
    try {
      const text = range.toString().trim();
      if (!text) return [];

      // Try splitting by numbered questions first
      let parts = text.split(/\n(?=\s*\d+[\.|\)|\uff0e]\s+)/);
      if (parts.length <= 1) {
        // Try splitting by double newlines
        parts = text.split(/\n\s*\n/).filter(Boolean);
      }

      const questions = parts.map((part, idx) => {
        const lines = part.split('\n').map(l => l.trim()).filter(Boolean);
        const opts = [];
        const stem = [];
        lines.forEach(line => {
          const m = line.match(/^([A-Z])[\.\)．:]\s*(.+)$/);
          if (m) opts.push({ letter: m[1], text: m[2] }); else stem.push(line);
        });
        // If no options found, attempt to locate options in DOM near the range
        if (!opts.length) {
          try {
            const found = this.findOptionsNearRange(range);
            if (found && found.length) {
              found.forEach(o => opts.push(o));
            }
          } catch (e) {
            console.warn('findOptionsNearRange failed', e);
          }
        }
        return { id: `sel-range-${idx}`, index: idx, question: stem.join(' ').slice(0,2000), type: opts.length? 'radio':'short-answer', options: opts, applySupported: false };
      });
      return questions;
    } catch (e) {
      console.error('extractFromSelection error', e);
      return [];
    }
  };

  // Try to find option-like elements/text near a selection Range
  ExamAssistant.prototype.findOptionsNearRange = function(range) {
    try {
      const maxSteps = 12;
      const res = [];
      // Start from the endContainer's parent element
      let el = range.endContainer.nodeType === 1 ? range.endContainer : range.endContainer.parentElement;
      if (!el) return res;

      // Search upward to a reasonable ancestor to find a question block
      let ancestor = el;
      for (let i = 0; i < 6; i++) {
        if (!ancestor) break;
        // look for option inputs inside ancestor
        const inputs = ancestor.querySelectorAll('input[type="radio"], input[type="checkbox"], .choices-html, .choices-label, .el-radio, .el-checkbox');
        if (inputs && inputs.length) {
          // collect textual options
          const seen = new Set();
          inputs.forEach(inp => {
            const parent = inp.closest('.choices, .el-radio, .el-checkbox') || inp.parentElement;
            const label = parent ? (parent.innerText || '').trim() : (inp.value || '').toString();
            const m = label.match(/^([A-Z])[\.\)．:]?\s*(.+)$/);
            if (m) {
              const letter = m[1]; const text = m[2];
              if (!seen.has(letter)) { res.push({ letter, text }); seen.add(letter); }
            } else if (label) {
              // fallback: assign sequential letters
              const letter = String.fromCharCode(65 + res.length);
              if (!seen.has(letter)) { res.push({ letter, text: label }); seen.add(letter); }
            }
          });
          if (res.length) return res;
        }
        ancestor = ancestor.parentElement;
      }

      // If not found, try scanning immediate following siblings from the end element
      let node = el;
      let steps = 0;
      while (node && steps < maxSteps) {
        // check nextElementSibling
        node = node.nextElementSibling;
        if (!node) break;
        const txt = (node.innerText || '').trim();
        if (!txt) { steps++; continue; }
        // split lines and detect option-like lines
        const lines = txt.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          const m = line.match(/^([A-D])[\.\)．:]\s*(.+)$/i);
          if (m) {
            res.push({ letter: m[1].toUpperCase(), text: m[2] });
          }
        }
        if (res.length) return res;
        steps++;
      }

      // As last resort, perform point-sampling below the range bounding rect to look for option text
      const rect = range.getBoundingClientRect();
      const sampleX = rect.left + rect.width / 2;
      for (let dy = 8; dy < 500; dy += 30) {
        const y = rect.bottom + dy;
        try {
          const elems = document.elementsFromPoint(sampleX, y);
          for (const e of elems) {
            const t = (e.innerText || '').trim();
            if (!t) continue;
            const lines = t.split('\n').map(l => l.trim()).filter(Boolean);
            for (const line of lines) {
              const m = line.match(/^([A-D])[\.\)．:]\s*(.+)$/i);
              if (m) {
                res.push({ letter: m[1].toUpperCase(), text: m[2] });
              }
            }
            if (res.length) return res;
          }
        } catch (e) { /* ignore */ }
      }

      return res;
    } catch (e) {
      console.error('findOptionsNearRange error', e);
      return [];
    }
  };

  // Helper: show modal for selection results (requests AI and shows answers)
  ExamAssistant.prototype.showSelectionResultsModal = function(questions) {
    try {
      const existing = document.getElementById('ea-selection-modal');
      if (existing) existing.remove();

      // Inject styles once
      if (!document.getElementById('ea-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'ea-modal-styles';
        style.textContent = `
          #ea-selection-modal{position:fixed;right:20px;top:15%;width:420px;background:linear-gradient(180deg,#ffffff,#fbfdff);padding:12px;border-radius:12px;z-index:1000006;box-shadow:0 10px 30px rgba(12,24,40,0.12);max-height:70vh;overflow:auto;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial;color:#111;transition:transform .22s ease,opacity .22s ease;transform:translateY(-8px);opacity:0;border:1px solid rgba(16,24,40,0.05);backdrop-filter:blur(6px);} 
          #ea-selection-modal.ea-open{transform:translateY(0);opacity:1;} 
          #ea-selection-modal .ea-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;border-bottom:1px solid #f0f3f5;margin-bottom:10px;cursor:grab;} 
          #ea-selection-modal .ea-title{font-size:15px;font-weight:700;color:#0f1720;} 
          #ea-selection-modal .ea-close{cursor:pointer;color:#8a8f98;font-size:18px;padding:6px;border-radius:6px;transition:background .12s ease,color .12s ease;} 
          #ea-selection-modal .ea-close:hover{background:rgba(0,0,0,0.04);color:#333;} 
          #ea-selection-list .ea-item{padding:10px;border:1px solid #f3f5f6;border-radius:8px;margin-bottom:8px;background:#fff;transition:box-shadow .12s;} 
          #ea-selection-list .ea-item:hover{box-shadow:0 6px 18px rgba(16,24,40,0.06);} 
          .ea-ai{color:#0b69ff;font-weight:600;} 
          .ea-meta{margin-top:6px;color:#6b7280;font-size:13px;} 
          .ea-actions{margin-top:8px;display:flex;gap:8px;} 
          .ea-btn{background:linear-gradient(180deg,#409EFF,#1A73E8);color:#fff;border:none;padding:6px 10px;border-radius:8px;cursor:pointer;font-weight:600;} 
          .ea-btn[disabled]{opacity:0.5;cursor:not-allowed;} 
        `;
        document.head.appendChild(style);
      }

      const modal = document.createElement('div');
      modal.id = 'ea-selection-modal';

      const header = document.createElement('div');
      header.className = 'ea-header';
      header.innerHTML = `<div class="ea-title">Selection Results</div><div class="ea-close" aria-label="close">×</div>`;
      modal.appendChild(header);

      const list = document.createElement('div');
      list.id = 'ea-selection-list';

      questions.forEach(q => {
        const item = document.createElement('div');
        item.className = 'ea-item';
        item.id = `ea-s-${q.id}`;
        item.innerHTML = `<div style="font-weight:600;color:#111;">${q.question.slice(0,300)}</div><div class="ea-meta">Type: ${q.type} ${q.applySupported? '· AutoApply':''}</div><div style="margin-top:8px;">AI: <span class="ea-ai">-</span></div><div class="ea-actions"><button class="ea-btn ea-btn-ai">Request AI</button><button class="ea-btn ea-btn-copy">Copy</button><button class="ea-btn ea-btn-apply" ${q.applySupported? '':'disabled'}>Apply</button></div>`;
        list.appendChild(item);
      });

      modal.appendChild(list);
      document.body.appendChild(modal);

      // animate in
      requestAnimationFrame(() => { modal.classList.add('ea-open'); });

      // close helpers & cleanup
      let isClosing = false;
      const cleanup = () => {
        document.removeEventListener('mousedown', onDocDown);
        document.removeEventListener('touchstart', onDocDown);
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);
      };

      const closeWithAnimation = () => {
        if (isClosing) return;
        isClosing = true;
        modal.classList.remove('ea-open');
        const onEnd = () => { cleanup(); if (modal && modal.parentNode) modal.parentNode.removeChild(modal); modal.removeEventListener('transitionend', onEnd); };
        modal.addEventListener('transitionend', onEnd);
        // fallback removal
        setTimeout(() => { if (modal && modal.parentNode) modal.parentNode.removeChild(modal); cleanup(); }, 400);
      };

      const onDocDown = (e) => {
        try {
          if (!modal.contains(e.target)) {
            closeWithAnimation();
          }
        } catch (err) { /* ignore */ }
      };

      document.addEventListener('mousedown', onDocDown);
      document.addEventListener('touchstart', onDocDown);

      // header close click
      header.querySelector('.ea-close').addEventListener('click', closeWithAnimation);

      // Drag to reposition
      let dragging = false;
      let dragOffsetX = 0;
      let dragOffsetY = 0;
      const onDragStart = (evt) => {
        dragging = true;
        const rect = modal.getBoundingClientRect();
        const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
        const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
        dragOffsetX = clientX - rect.left;
        dragOffsetY = clientY - rect.top;
        modal.style.transition = 'none';
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
        document.addEventListener('touchmove', onDragMove, {passive:false});
        document.addEventListener('touchend', onDragEnd);
      };
      const onDragMove = (evt) => {
        if (!dragging) return;
        evt.preventDefault();
        const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
        const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
        let left = clientX - dragOffsetX;
        let top = clientY - dragOffsetY;
        // constrain to viewport
        const pad = 8;
        const w = modal.offsetWidth, h = modal.offsetHeight;
        left = Math.max(pad, Math.min(window.innerWidth - w - pad, left));
        top = Math.max(pad, Math.min(window.innerHeight - h - pad, top));
        modal.style.left = left + 'px';
        modal.style.top = top + 'px';
        modal.style.right = 'auto';
        modal.style.transform = 'none';
        modal.style.opacity = '1';
      };
      const onDragEnd = () => { dragging = false; modal.style.transition = ''; document.removeEventListener('mousemove', onDragMove); document.removeEventListener('mouseup', onDragEnd); document.removeEventListener('touchmove', onDragMove); document.removeEventListener('touchend', onDragEnd); };
      header.addEventListener('mousedown', onDragStart);
      header.addEventListener('touchstart', onDragStart, {passive:true});

      // wire buttons
      list.querySelectorAll('.ea-btn-ai').forEach((btn, idx) => {
        btn.addEventListener('click', () => {
          const q = questions[idx];
          chrome.runtime.sendMessage({ action: 'GET_AI_ANSWERS_BATCH', data: [q] }, (resp) => {
            if (resp && resp.results && resp.results[0]) {
              const r = resp.results[0];
              const el = document.querySelector(`#ea-s-${q.id}`);
              if (el) el.querySelector('.ea-ai').textContent = r.answer || (r.error? `Error: ${r.error}` : '');
            }
          });
        });
      });

      list.querySelectorAll('.ea-btn-copy').forEach((btn, idx) => {
        btn.addEventListener('click', async () => {
          const q = questions[idx];
          const el = document.querySelector(`#ea-s-${q.id}`);
          const ai = el ? el.querySelector('.ea-ai').textContent.trim() : '';
          if (ai) await navigator.clipboard.writeText(ai);
        });
      });

      list.querySelectorAll('.ea-btn-apply').forEach((btn, idx) => {
        btn.addEventListener('click', async () => {
          const q = questions[idx];
          const el = document.querySelector(`#ea-s-${q.id}`);
          const ai = el ? el.querySelector('.ea-ai').textContent.trim() : '';
          if (!ai) return;
          chrome.runtime.sendMessage({ action: 'APPLY_ANSWERS_BATCH', data: [{ id: q.id, answer: ai }] }, (resp) => {
            if (resp && resp.results && resp.results[0]) {
              const ok = resp.results[0].success;
              btn.textContent = ok ? 'Applied' : 'Failed';
            }
          });
        });
      });

    } catch (e) {
      console.error('showSelectionResultsModal error', e);
    }
  };
}
