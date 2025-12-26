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
        padding: 15px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        border-radius: 8px;
        z-index: 999999;
        font-family: sans-serif;
        font-size: 14px;
        pointer-events: none;
        transition: all 0.3s;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      `;
      div.innerText = 'AI Assistant Ready';
      document.body.appendChild(div);
      this.statusPanel = div;
    }

    updateStatus(text, color = 'white') {
      if (this.statusPanel) {
        this.statusPanel.innerText = text;
        this.statusPanel.style.color = color;
      }
      console.log(`[ExamAssistant] ${text}`);
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.updateStatus("Started - Looking for questions...", "#409EFF");
      this.processLoop();
    }

    stop() {
      this.isRunning = false;
      this.updateStatus("Stopped", "#F56C6C");
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
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'ai-exam-debug-modal';
      modal.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 20px rgba(0,0,0,0.5);
        z-index: 1000000; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;
        color: #333; font-family: sans-serif;
      `;

      const optionsHtml = data.options.map(o => {
          // Highlight selected answer
          const isSelected = answer && answer.includes(o.letter);
          const bg = isSelected ? '#e1f3d8' : 'transparent';
          const border = isSelected ? '1px solid #67c23a' : '1px solid transparent';
          return `<div style="background:${bg}; border:${border}; padding: 2px; border-radius: 4px;"><b>${o.letter}</b>: ${o.text}</div>`
      }).join('');
      
      const answerHtml = answer ? 
        `<div style="margin: 15px 0; padding: 10px; background: #ecf5ff; border-left: 4px solid #409eff;">
            <strong>AI Suggestion:</strong> <span style="font-size: 1.2em; color: #409eff; font-weight: bold;">${answer}</span>
         </div>` : '';

      modal.innerHTML = `
        <h3 style="margin-top:0">${title}</h3>
        <div style="background:#f5f5f5; padding:10px; margin:10px 0; border-radius:4px;">
          <strong>Q:</strong> ${data.question}
        </div>
        ${answerHtml}
        <div style="margin-bottom:15px;">
          ${optionsHtml}
        </div>
        <div style="text-align:right; gap:10px; display:flex; justify-content:flex-end;">
          <button id="debug-cancel" style="padding:8px 15px; background:#f56c6c; color:white; border:none; border-radius:4px; cursor:pointer;">Stop</button>
          <button id="debug-confirm" style="padding:8px 15px; background:#409eff; color:white; border:none; border-radius:4px; cursor:pointer;">
            ${answer ? 'Apply Answer' : 'Confirm Question'}
          </button>
        </div>
      `;

      document.body.appendChild(modal);

      document.getElementById('debug-confirm').onclick = () => {
        modal.remove();
        resolve(true);
      };

      document.getElementById('debug-cancel').onclick = () => {
        modal.remove();
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
