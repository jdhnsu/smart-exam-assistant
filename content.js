if (!window.hasExamAssistantRunning) {
  window.hasExamAssistantRunning = true;

  class ExamAssistant {
    constructor() {
      this.isRunning = false;
      this.statusPanel = null;
      this._lastCopiedQuestion = null;
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
        width: 12px;
        height: 12px;
        background: rgba(64, 158, 255, 0.15);
        border-radius: 50%;
        z-index: 999999;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 6px rgba(64, 158, 255, 0.3);
      `;
      
      const playIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
      const pauseIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
      const nextIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`;
      const copyIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;

      div.innerHTML = `
        <div class="ea-controls" style="display: none; position: absolute; bottom: 20px; right: 20px; flex-direction: column; gap: 6px; background: rgba(0, 0, 0, 0.85); padding: 8px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); pointer-events: auto;">
            <button id="ea-btn-copy" title="Copy Question" style="background: rgba(230, 162, 60, 0.2); border: none; color: #E6A23C; cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s;">
                ${copyIcon}
            </button>
            <button id="ea-btn-start" title="Get Answer" style="background: rgba(103, 194, 58, 0.2); border: none; color: #67C23A; cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s;">
                ${playIcon}
            </button>
            <button id="ea-btn-pause" title="Cancel" style="background: rgba(245, 108, 108, 0.2); border: none; color: #F56C6C; cursor: pointer; padding: 6px; display: none; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s;">
                ${pauseIcon}
            </button>
            <button id="ea-btn-next" title="Next Question" style="background: rgba(64, 158, 255, 0.2); border: none; color: #409EFF; cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s;">
                ${nextIcon}
            </button>
        </div>
      `;

      document.body.appendChild(div);
      this.statusPanel = div;
      this.btnCopy = div.querySelector('#ea-btn-copy');
      this.btnStart = div.querySelector('#ea-btn-start');
      this.btnPause = div.querySelector('#ea-btn-pause');
      this.btnNext = div.querySelector('#ea-btn-next');
      this.controls = div.querySelector('.ea-controls');
      this._hideControlsTimer = null;

      // Interaction Logic - Show controls on hover with delay
      const showControls = () => {
          if (this._hideControlsTimer) {
              clearTimeout(this._hideControlsTimer);
              this._hideControlsTimer = null;
          }
          this.controls.style.display = 'flex';
          div.style.background = 'rgba(64, 158, 255, 0.4)';
          div.style.boxShadow = '0 0 10px rgba(64, 158, 255, 0.6)';
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
      [this.btnCopy, this.btnStart, this.btnPause, this.btnNext].forEach(btn => {
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
          success = this.selectOption(questionEl, answer);
        }

        if (success) {
          const msg = data.type === 'short-answer' ? "Answer filled. Click Next manually." : "Answered. Click Next manually.";
          this.updateStatus(msg, "#67C23A");
          // Stop automatically after answering one question
          this.stop();
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
      }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_ANSWERING") {
      assistant.start();
    } else if (request.action === "STOP_ANSWERING") {
      assistant.stop();
    }
  });
}
