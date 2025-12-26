if (!window.hasExamAssistantRunning) {
  window.hasExamAssistantRunning = true;

  class ExamAssistant {
    constructor() {
      this.isRunning = false;
      this.statusPanel = null;
      this.createStatusPanel();
    }

    createStatusPanel() {
      if (document.getElementById('ai-exam-assistant-status')) return;

      const div = document.createElement('div');
      div.id = 'ai-exam-assistant-status';
      div.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.4);
        color: white;
        border-radius: 20px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        backdrop-filter: blur(3px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        transform-origin: right bottom;
        max-width: 40px;
        overflow: hidden;
        white-space: nowrap;
        opacity: 0.6;
      `;
      
      const playIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
      const pauseIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
      const robotIcon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 1 0 7.5 18 2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5"/></svg>`;

      div.innerHTML = `
        <div class="ea-icon-wrapper" style="display: flex; align-items: center; justify-content: center; min-width: 20px;">
            ${robotIcon}
        </div>
        <div id="ea-status-text" style="font-weight: 500; opacity: 0; transition: opacity 0.2s;">AI Ready</div>
        <div class="ea-controls" style="display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s;">
            <button id="ea-btn-start" title="Start" style="background: none; border: none; color: #67C23A; cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
                ${playIcon}
            </button>
            <button id="ea-btn-pause" title="Pause" style="background: none; border: none; color: #F56C6C; cursor: pointer; padding: 2px; display: none; align-items: center; justify-content: center; border-radius: 4px;">
                ${pauseIcon}
            </button>
        </div>
      `;

      document.body.appendChild(div);
      this.statusPanel = div;
      this.statusText = div.querySelector('#ea-status-text');
      this.btnStart = div.querySelector('#ea-btn-start');
      this.btnPause = div.querySelector('#ea-btn-pause');
      this.controls = div.querySelector('.ea-controls');

      // Interaction Logic
      const expand = () => {
          div.style.maxWidth = '300px';
          div.style.background = 'rgba(0, 0, 0, 0.85)';
          div.style.opacity = '1';
          div.style.padding = '12px 16px';
          div.style.borderRadius = '8px';
          this.statusText.style.opacity = '1';
          this.controls.style.opacity = '1';
      };

      const collapse = () => {
          div.style.maxWidth = '42px';
          div.style.background = 'rgba(0, 0, 0, 0.4)';
          div.style.opacity = '0.6';
          div.style.padding = '8px 12px';
          div.style.borderRadius = '20px';
          this.statusText.style.opacity = '0';
          this.controls.style.opacity = '0';
      };

      div.addEventListener('mouseenter', expand);
      div.addEventListener('mouseleave', collapse);

      // Keep expanded if running? No, user requested semi-hidden.
      // But maybe flash briefly on status update?

      this.btnStart.onclick = (e) => { e.stopPropagation(); this.start(); };
      this.btnPause.onclick = (e) => { e.stopPropagation(); this.stop(); };
    }

    updateStatus(text, color = 'white') {
      if (this.statusText) {
        this.statusText.innerText = text;
        this.statusText.style.color = color;
      }
      console.log(`[ExamAssistant] ${text}`);
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.updateStatus("Started", "#409EFF");
      
      if (this.btnStart) {
          this.btnStart.style.display = 'none';
          this.btnPause.style.display = 'flex';
      }
      
      this.processLoop();
    }

    stop() {
      this.isRunning = false;
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

      // 2. Check if already answered
      if (this.isQuestionAnswered(questionEl)) {
        this.updateStatus("Question answered. Moving to next...", "#67C23A");
        this.goToNextQuestion();
        setTimeout(() => this.processLoop(), 3000);
        return;
      }

      // 3. Extract Data
      this.updateStatus("Extracting question data...");
      const data = this.extractQuestionData(questionEl);
      if (!data || !data.options.length) {
        this.updateStatus("Failed to extract question/options", "red");
        setTimeout(() => this.processLoop(), 2000);
        return;
      }

      // DEBUG STEP 1: Verify Question
      if (await this.isDebugMode()) {
        const confirmed = await this.showQuestionVerification(data);
        if (!confirmed) {
          this.updateStatus("Skipped by user (Debug Mode)", "orange");
          this.stop();
          return;
        }
      }

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
        
        // 5. Select Option
        const success = this.selectOption(questionEl, answer);
        
        if (success) {
          // 6. Wait and move on
          setTimeout(() => {
            this.goToNextQuestion();
            setTimeout(() => this.processLoop(), 3000); 
          }, 1000);
        } else {
          this.updateStatus(`Could not select option ${answer}`, "red");
          this.stop();
        }

      } catch (err) {
        this.updateStatus(`Error: ${err.message || err}`, "red");
        this.stop();
      }
    }

    findCurrentQuestion() {
      // Filter for visible questions only
      const questions = Array.from(document.querySelectorAll('.item-box'));
      return questions.find(q => {
        const style = window.getComputedStyle(q);
        return style.display !== 'none' && style.visibility !== 'hidden' && q.offsetParent !== null;
      });
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

        // Detect type
        const isCheckbox = !!questionEl.querySelector('.el-checkbox-group');

        // Extract Options (support both radio and checkbox)
        const options = [];
        // Select both types of containers
        const optionEls = questionEl.querySelectorAll('.el-radio-group .choices, .el-checkbox-group .choices');
        
        optionEls.forEach(opt => {
          // Support both radio and checkbox inputs
          const input = opt.querySelector('input.el-radio__original, input.el-checkbox__original');
          const labelText = opt.querySelector('.choices-html');
          const letterDiv = opt.querySelector('.choices-label');
          
          let letter = letterDiv ? letterDiv.innerText.replace('.', '').trim() : '';
          if (!letter && input) letter = input.value;
          
          const text = labelText ? labelText.innerText.trim() : '';
          
          if (letter && text) {
            options.push({ letter, text });
          }
        });

        return {
          question: questionText,
          options: options,
          type: isCheckbox ? 'checkbox' : 'radio'
        };
      } catch (e) {
        console.error("Extraction error", e);
        return null;
      }
    }

    async isDebugMode() {
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

    createModal(title, data, answer, resolve) {
      const existing = document.getElementById('ai-exam-debug-modal');
      const existingOverlay = document.getElementById('ai-exam-debug-overlay');
      if (existing) existing.remove();
      if (existingOverlay) existingOverlay.remove();

      // Create Overlay for click-outside detection
      const overlay = document.createElement('div');
      overlay.id = 'ai-exam-debug-overlay';
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.3); z-index: 999999;
        backdrop-filter: blur(2px);
      `;

      const modal = document.createElement('div');
      modal.id = 'ai-exam-debug-modal';
      modal.style.cssText = `
        position: fixed; top: 15%; right: 20px; width: 350px;
        background: white; padding: 15px; border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 1000000; max-height: 70vh; overflow-y: auto;
        color: #333; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px; border: 1px solid #ebeef5;
        transform: translateY(0); transition: all 0.3s;
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
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:8px;">
            <h3 style="margin:0; font-size:14px; font-weight:600;">${title}</h3>
            <span style="color:#999; font-size:11px;">Click outside to hide</span>
        </div>
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
      `;

      document.body.appendChild(overlay);
      document.body.appendChild(modal);

      const cleanup = () => {
        if (document.body.contains(modal)) modal.remove();
        if (document.body.contains(overlay)) overlay.remove();
      };

      document.getElementById('debug-confirm').onclick = () => {
        cleanup();
        resolve(true);
      };

      // Stop button
      document.getElementById('debug-cancel').onclick = () => {
        cleanup();
        resolve(false); // Stop execution
      };

      // Click outside (Overlay) -> Hide and Stop (Stealth Mode)
      overlay.onclick = () => {
        cleanup();
        this.updateStatus("Hidden by user interaction", "gray");
        resolve(false); // Stop execution to be safe/stealthy
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

    selectOption(questionEl, answer) {
      // Answer can be "A" or "AC"
      const letters = answer.split('');
      let successCount = 0;

      const inputs = Array.from(questionEl.querySelectorAll('input.el-radio__original, input.el-checkbox__original'));
      
      letters.forEach(letter => {
        const targetInput = inputs.find(i => i.value === letter);
        if (targetInput) {
          const clickableLabel = targetInput.closest('.el-radio, .el-checkbox');
          // Check if already checked to avoid unchecking in checkbox mode
          const isChecked = clickableLabel.classList.contains('is-checked');
          
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

      return successCount > 0;
    }

    goToNextQuestion() {
      this.updateStatus("Clicking Next...", "#909399");
      
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
        if (this.clickElementOrParent(nextBtnText)) return;
      }

      // Strategy 2: Sidebar numbers (.q-num-box)
      console.log("Next button not found via text. Trying sidebar...");
      const activeNum = document.querySelector('.q-num-box.haveActive');
      if (activeNum) {
        // Try next sibling
        const nextNum = activeNum.nextElementSibling;
        if (nextNum && nextNum.classList.contains('q-num-box')) {
          this.updateStatus("Using sidebar navigation...", "#909399");
          nextNum.click();
          return;
        }
      }
      
      this.updateStatus("Could not find next question button", "red");
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

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_ANSWERING") {
      assistant.start();
    } else if (request.action === "STOP_ANSWERING") {
      assistant.stop();
    }
  });
}
