var EA = typeof EA !== 'undefined' ? EA : {};

EA.UI = {
  injectStyles() {
    if (document.getElementById('ea-modal-styles')) return;
    var style = document.createElement('style');
    style.id = 'ea-modal-styles';
    style.textContent =
      '#ea-selection-modal{position:fixed;right:20px;top:15%;width:420px;background:linear-gradient(180deg,#ffffff,#fbfdff);padding:12px;border-radius:12px;z-index:1000006;box-shadow:0 10px 30px rgba(12,24,40,0.12);max-height:70vh;overflow:auto;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial;color:#111;transition:transform .22s ease,opacity .22s ease;transform:translateY(-8px);opacity:0;border:1px solid rgba(16,24,40,0.05);backdrop-filter:blur(6px);}' +
      '#ea-selection-modal.ea-open{transform:translateY(0);opacity:1;}' +
      '#ea-selection-modal .ea-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;border-bottom:1px solid #f0f3f5;margin-bottom:10px;cursor:grab;}' +
      '#ea-selection-modal .ea-title{font-size:15px;font-weight:700;color:#0f1720;}' +
      '#ea-selection-modal .ea-close{cursor:pointer;color:#8a8f98;font-size:18px;padding:6px;border-radius:6px;transition:background .12s ease,color .12s ease;}' +
      '#ea-selection-modal .ea-close:hover{background:rgba(0,0,0,0.04);color:#333;}' +
      '#ea-selection-list .ea-item{padding:10px;border:1px solid #f3f5f6;border-radius:8px;margin-bottom:8px;background:#fff;transition:box-shadow .12s;}' +
      '#ea-selection-list .ea-item:hover{box-shadow:0 6px 18px rgba(16,24,40,0.06);}' +
      '.ea-ai{color:#0b69ff;font-weight:600;}' +
      '.ea-meta{margin-top:6px;color:#6b7280;font-size:13px;}' +
      '.ea-actions{margin-top:8px;display:flex;gap:8px;}' +
      '.ea-btn{background:linear-gradient(180deg,#409EFF,#1A73E8);color:#fff;border:none;padding:6px 10px;border-radius:8px;cursor:pointer;font-weight:600;}' +
      '.ea-btn[disabled]{opacity:0.5;cursor:not-allowed;}';
    document.head.appendChild(style);
  },

  createStatusPanel() {
    if (document.getElementById('ai-exam-assistant-status')) return null;

    var panel = {};

    var div = document.createElement('div');
    div.id = 'ai-exam-assistant-status';
    div.style.cssText = 'position:fixed;bottom:20px;right:20px;width:44px;height:44px;border-radius:10px;background:rgba(64,158,255,0.15);display:flex;align-items:center;justify-content:center;z-index:1000005;box-shadow:0 6px 18px rgba(64,158,255,0.12);transition:all .14s ease;';

    panel.controls = document.createElement('div');
    panel.controls.style.cssText = 'position:fixed;bottom:76px;right:20px;display:flex;flex-direction:row;gap:8px;padding:8px;border-radius:10px;background:rgba(255,255,255,0.98);box-shadow:0 8px 30px rgba(12,24,40,0.06);z-index:1000006;align-items:center;';
    panel.controls.style.display = 'none';

    function makeBtn(txt) {
      var b = document.createElement('button');
      b.textContent = txt;
      b.style.cssText = 'padding:6px 8px;border-radius:8px;border:none;background:linear-gradient(180deg,#fff,#f3f6fb);cursor:pointer;font-weight:600;box-shadow:0 2px 8px rgba(16,24,40,0.04);';
      return b;
    }

    panel.btnCopy = makeBtn('Copy');
    panel.btnStart = makeBtn('Start');
    panel.btnPause = makeBtn('Stop');
    panel.btnNext = makeBtn('Next');
    panel.btnAuto = makeBtn('Auto');

    panel.controls.appendChild(panel.btnCopy);
    panel.controls.appendChild(panel.btnStart);
    panel.controls.appendChild(panel.btnPause);
    panel.controls.appendChild(panel.btnNext);
    panel.controls.appendChild(panel.btnAuto);

    panel.statusDot = document.createElement('div');
    panel.statusDot.style.cssText = 'width:12px;height:12px;border-radius:50%;background:rgba(64,158,255,0.15);transition:all .14s ease;';
    div.appendChild(panel.statusDot);

    document.body.appendChild(panel.controls);
    document.body.appendChild(div);

    panel._hideTimer = null;

    function showControls() {
      if (panel._hideTimer) { clearTimeout(panel._hideTimer); panel._hideTimer = null; }
      panel.controls.style.display = 'flex';
      div.style.background = 'rgba(64, 158, 255, 0.4)';
    }

    function hideControls() {
      panel._hideTimer = setTimeout(function () {
        panel.controls.style.display = 'none';
        div.style.background = 'rgba(64, 158, 255, 0.15)';
        div.style.boxShadow = '0 0 6px rgba(64, 158, 255, 0.3)';
      }, 300);
    }

    div.addEventListener('mouseenter', showControls);
    div.addEventListener('mouseleave', hideControls);
    panel.controls.addEventListener('mouseenter', function () {
      if (panel._hideTimer) { clearTimeout(panel._hideTimer); panel._hideTimer = null; }
    });
    panel.controls.addEventListener('mouseleave', hideControls);

    [panel.btnCopy, panel.btnStart, panel.btnPause, panel.btnNext, panel.btnAuto].forEach(function (btn) {
      if (!btn) return;
      btn.addEventListener('mouseenter', function () {
        btn.style.transform = 'scale(1.1)';
        btn.style.opacity = '1';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = 'scale(1)';
        btn.style.opacity = '0.9';
      });
    });

    panel.updateStatus = function (text) {
      if (this.statusDot) {
        if (text.includes('Error') || text.includes('failed') || text.includes('Could not')) {
          this.statusDot.style.background = 'rgba(245, 108, 108, 0.3)';
          this.statusDot.style.boxShadow = '0 0 8px rgba(245, 108, 108, 0.5)';
        } else if (text.includes('copied') || text.includes('Answered') || text.includes('filled')) {
          this.statusDot.style.background = 'rgba(103, 194, 58, 0.3)';
          this.statusDot.style.boxShadow = '0 0 8px rgba(103, 194, 58, 0.5)';
        } else if (text.includes('Thinking') || text.includes('Started')) {
          this.statusDot.style.background = 'rgba(230, 162, 60, 0.3)';
          this.statusDot.style.boxShadow = '0 0 8px rgba(230, 162, 60, 0.5)';
        } else {
          this.statusDot.style.background = 'rgba(64, 158, 255, 0.15)';
          this.statusDot.style.boxShadow = '0 0 6px rgba(64, 158, 255, 0.3)';
        }
      }
      console.log('[ExamAssistant] ' + text);
    };

    panel.updateAutoButtonState = function (autoMode) {
      if (!this.btnAuto) return;
      this.btnAuto.textContent = autoMode ? 'Auto On' : 'Auto Off';
      this.btnAuto.style.opacity = '0.95';
      if (autoMode) {
        this.btnAuto.style.background = 'linear-gradient(180deg,#67c23a,#4ea72e)';
        this.btnAuto.style.color = '#fff';
        this.btnAuto.style.boxShadow = '0 4px 12px rgba(103,194,58,0.28)';
      } else {
        this.btnAuto.style.background = 'linear-gradient(180deg,#fff,#f3f6fb)';
        this.btnAuto.style.color = '#303133';
        this.btnAuto.style.boxShadow = '0 2px 8px rgba(16,24,40,0.04)';
      }
    };

    panel.showRunning = function () {
      if (this.btnStart) this.btnStart.style.display = 'none';
      if (this.btnPause) this.btnPause.style.display = 'flex';
    };

    panel.showStopped = function () {
      if (this.btnStart) this.btnStart.style.display = 'flex';
      if (this.btnPause) this.btnPause.style.display = 'none';
    };

    return panel;
  },

  createDebugModal(title, data, answer) {
    return new Promise(function (resolve) {
      var existing = document.getElementById('ai-exam-debug-modal');
      if (existing) existing.remove();

      EA.Utils.storageGetLocal([EA.StorageKeys.DEBUG_MODAL_POS]).then(function (res) {
        var pos = res[EA.StorageKeys.DEBUG_MODAL_POS] || { top: '15%', right: '20px', left: 'auto' };

        var modal = document.createElement('div');
        modal.id = 'ai-exam-debug-modal';
        modal.style.cssText =
          'position:fixed;' +
          'top:' + pos.top + ';' +
          'left:' + pos.left + ';' +
          'right:' + pos.right + ';' +
          'width:350px;' +
          'background:rgba(255,255,255,0.95);' +
          'padding:0;' +
          'border-radius:12px;' +
          'box-shadow:0 4px 20px rgba(0,0,0,0.15);' +
          'z-index:1000000;' +
          'max-height:70vh;' +
          'display:flex;' +
          'flex-direction:column;' +
          'color:#333;' +
          'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
          'font-size:13px;' +
          'border:1px solid rgba(0,0,0,0.1);' +
          'backdrop-filter:blur(10px);' +
          'transform:translateY(0);' +
          'transition:opacity 0.3s;';

        var optionsHtml = data.options.map(function (o) {
          var isSelected = answer && answer.includes(o.letter);
          var bg = isSelected ? '#f0f9eb' : 'transparent';
          var border = isSelected ? '1px solid #67c23a' : '1px solid transparent';
          var color = isSelected ? '#67c23a' : '#606266';
          return '<div style="background:' + bg + ';border:' + border + ';color:' + color + ';padding:6px;margin-bottom:4px;border-radius:6px;display:flex;gap:6px;">' +
            '<span style="font-weight:bold;">' + o.letter + '.</span>' +
            '<span>' + o.text + '</span>' +
            '</div>';
        }).join('');

        var answerHtml = answer ?
          '<div style="margin:10px 0;padding:8px 12px;background:#ecf5ff;border-radius:6px;color:#409eff;display:flex;align-items:center;justify-content:space-between;">' +
          '<span style="font-weight:bold;">AI Suggestion:</span>' +
          '<span style="font-size:1.4em;font-weight:bold;">' + answer + '</span>' +
          '</div>' : '';

        modal.innerHTML =
          '<div id="debug-header" style="padding:12px 15px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;cursor:move;background:rgba(248,249,250,0.8);border-radius:12px 12px 0 0;user-select:none;">' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
          '<span style="width:8px;height:8px;background:#409eff;border-radius:50%;"></span>' +
          '<h3 style="margin:0;font-size:13px;font-weight:600;">' + title + '</h3>' +
          '</div>' +
          '<div style="font-size:16px;color:#909399;cursor:pointer;padding:0 4px;" id="debug-close">\u00d7</div>' +
          '</div>' +
          '<div style="padding:15px;overflow-y:auto;max-height:calc(70vh - 100px);">' +
          '<div style="background:#f5f7fa;padding:10px;margin-bottom:10px;border-radius:6px;line-height:1.4;">' +
          data.question +
          '</div>' +
          answerHtml +
          '<div style="margin-bottom:15px;">' +
          optionsHtml +
          '</div>' +
          '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
          '<button id="debug-cancel" style="padding:6px 12px;background:#f56c6c;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Stop</button>' +
          '<button id="debug-confirm" style="padding:6px 12px;background:#409eff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">' +
          (answer ? 'Apply' : 'Confirm') +
          '</button>' +
          '</div>' +
          '</div>';

        document.body.appendChild(modal);

        var header = modal.querySelector('#debug-header');
        var isDragging = false;
        var startX, startY, initialLeft, initialTop;

        header.onmousedown = function (e) {
          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          var rect = modal.getBoundingClientRect();
          initialLeft = rect.left;
          initialTop = rect.top;
          modal.style.right = 'auto';
          modal.style.width = rect.width + 'px';
        };

        document.onmousemove = function (e) {
          if (!isDragging) return;
          e.preventDefault();
          var dx = e.clientX - startX;
          var dy = e.clientY - startY;
          var newLeft = initialLeft + dx;
          var newTop = initialTop + dy;
          var maxLeft = window.innerWidth - modal.offsetWidth;
          var maxTop = window.innerHeight - modal.offsetHeight;
          if (newLeft < 0) newLeft = 0;
          if (newTop < 0) newTop = 0;
          if (newLeft > maxLeft) newLeft = maxLeft;
          if (newTop > maxTop) newTop = maxTop;
          modal.style.left = newLeft + 'px';
          modal.style.top = newTop + 'px';
        };

        document.onmouseup = function () {
          if (isDragging) {
            isDragging = false;
            EA.Utils.storageSetLocal({
              debugModalPos: {
                top: modal.style.top,
                left: modal.style.left,
                right: 'auto'
              }
            });
          }
        };

        var outsideClickListener = function (e) {
          if (modal && !modal.contains(e.target)) {
            cleanup();
            resolve(false);
          }
        };

        var keyDownListener = function (e) {
          if (e.altKey && e.key.toLowerCase() === 't') {
            cleanup();
            resolve(false);
          }
        };

        setTimeout(function () {
          document.addEventListener('click', outsideClickListener);
          document.addEventListener('keydown', keyDownListener);
        }, 100);

        var cleanup = function () {
          if (document.body.contains(modal)) modal.remove();
          document.removeEventListener('click', outsideClickListener);
          document.removeEventListener('keydown', keyDownListener);
          document.onmousemove = null;
          document.onmouseup = null;
        };

        document.getElementById('debug-confirm').onclick = function () {
          cleanup();
          resolve(true);
        };

        document.getElementById('debug-cancel').onclick = function () {
          cleanup();
          resolve(false);
        };

        document.getElementById('debug-close').onclick = function () {
          cleanup();
          resolve(false);
        };
      });
    });
  },

  createDebugModalLive: function (title, data) {
    var injectKeyframes = function () {
      if (document.getElementById('ea-debug-spin-style')) return;
      var ks = document.createElement('style');
      ks.id = 'ea-debug-spin-style';
      ks.textContent = '@keyframes ea-debug-spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(ks);
    };
    injectKeyframes();

    var existing = document.getElementById('ai-exam-debug-modal');
    if (existing) existing.remove();

    return EA.Utils.storageGetLocal([EA.StorageKeys.DEBUG_MODAL_POS]).then(function (res) {
      var pos = res[EA.StorageKeys.DEBUG_MODAL_POS] || { top: '15%', right: '20px', left: 'auto' };

      var modal = document.createElement('div');
      modal.id = 'ai-exam-debug-modal';
      modal.style.cssText =
        'position:fixed;' +
        'top:' + pos.top + ';' +
        'left:' + pos.left + ';' +
        'right:' + pos.right + ';' +
        'width:350px;' +
        'background:rgba(255,255,255,0.95);' +
        'padding:0;' +
        'border-radius:12px;' +
        'box-shadow:0 4px 20px rgba(0,0,0,0.15);' +
        'z-index:1000001;' +
        'max-height:70vh;' +
        'display:flex;' +
        'flex-direction:column;' +
        'color:#333;' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
        'font-size:13px;' +
        'border:1px solid rgba(0,0,0,0.1);' +
        'backdrop-filter:blur(10px);' +
        'transform:translateY(0);' +
        'transition:opacity 0.3s;';

      var optionsHtmlNoHighlight = data.options.map(function (o) {
        return '<div style="background:transparent;border:1px solid transparent;color:#606266;padding:6px;margin-bottom:4px;border-radius:6px;display:flex;gap:6px;" class="ea-debug-option" data-letter="' + o.letter + '">' +
          '<span style="font-weight:bold;">' + o.letter + '.</span>' +
          '<span>' + o.text + '</span>' +
          '</div>';
      }).join('');

      var loadingHtml =
        '<div id="debug-answer-area" style="margin:10px 0;padding:10px 12px;background:#fdf6ec;border-radius:6px;display:flex;align-items:center;gap:10px;">' +
        '<span style="display:inline-block;width:20px;height:20px;border:2.5px solid #E6A23C;border-top-color:transparent;border-radius:50%;animation:ea-debug-spin 0.7s linear infinite;"></span>' +
        '<span style="color:#E6A23C;font-weight:600;">AI is thinking...</span>' +
        '</div>';

      var buttonsHtml =
        '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
        '<button id="debug-cancel" style="padding:6px 12px;background:#f56c6c;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Stop</button>' +
        '<button id="debug-confirm" style="padding:6px 12px;background:#409eff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;opacity:0.5;" disabled>Waiting...</button>' +
        '</div>';

      modal.innerHTML =
        '<div id="debug-header" style="padding:12px 15px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;cursor:move;background:rgba(248,249,250,0.8);border-radius:12px 12px 0 0;user-select:none;">' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
        '<span style="width:8px;height:8px;background:#E6A23C;border-radius:50%;"></span>' +
        '<h3 style="margin:0;font-size:13px;font-weight:600;">' + title + '</h3>' +
        '</div>' +
        '<div style="font-size:16px;color:#909399;cursor:pointer;padding:0 4px;" id="debug-close">\u00d7</div>' +
        '</div>' +
        '<div style="padding:15px;overflow-y:auto;max-height:calc(70vh - 100px);">' +
        '<div style="background:#f5f7fa;padding:10px;margin-bottom:10px;border-radius:6px;line-height:1.4;">' +
        data.question +
        '</div>' +
        loadingHtml +
        '<div style="margin-bottom:15px;" id="debug-options-area">' +
        optionsHtmlNoHighlight +
        '</div>' +
        buttonsHtml +
        '</div>';

      document.body.appendChild(modal);

      var header = modal.querySelector('#debug-header');
      var isDragging = false;
      var startX, startY, initialLeft, initialTop;

      header.onmousedown = function (e) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        var rect = modal.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        modal.style.right = 'auto';
        modal.style.width = rect.width + 'px';
      };

      document.onmousemove = function (e) {
        if (!isDragging) return;
        e.preventDefault();
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        var newLeft = initialLeft + dx;
        var newTop = initialTop + dy;
        var maxLeft = window.innerWidth - modal.offsetWidth;
        var maxTop = window.innerHeight - modal.offsetHeight;
        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;
        if (newLeft > maxLeft) newLeft = maxLeft;
        if (newTop > maxTop) newTop = maxTop;
        modal.style.left = newLeft + 'px';
        modal.style.top = newTop + 'px';
      };

      document.onmouseup = function () {
        if (isDragging) {
          isDragging = false;
          EA.Utils.storageSetLocal({
            debugModalPos: {
              top: modal.style.top,
              left: modal.style.left,
              right: 'auto'
            }
          });
        }
      };

      var confirmed = false;
      var settled = false;

      var resolveFn = null;
      var confirmPromise = new Promise(function (res) { resolveFn = res; });

      var cleanup = function () {
        if (document.body.contains(modal)) modal.remove();
        document.removeEventListener('click', outsideClickListener);
        document.removeEventListener('keydown', keyDownListener);
        document.onmousemove = null;
        document.onmouseup = null;
      };

      var outsideClickListener = function (e) {
        if (modal && !modal.contains(e.target)) {
          cleanup();
          if (!settled) { settled = true; resolveFn(false); }
        }
      };

      var keyDownListener = function (e) {
        if (e.altKey && e.key.toLowerCase() === 't') {
          cleanup();
          if (!settled) { settled = true; resolveFn(false); }
        }
      };

      setTimeout(function () {
        document.addEventListener('click', outsideClickListener);
        document.addEventListener('keydown', keyDownListener);
      }, 100);

      document.getElementById('debug-confirm').onclick = function () {
        if (document.getElementById('debug-confirm').disabled) return;
        cleanup();
        if (!settled) { settled = true; resolveFn(true); }
      };

      document.getElementById('debug-cancel').onclick = function () {
        cleanup();
        if (!settled) { settled = true; resolveFn(false); }
      };

      document.getElementById('debug-close').onclick = function () {
        cleanup();
        if (!settled) { settled = true; resolveFn(false); }
      };

      var answerEl = modal.querySelector('#debug-answer-area');
      var confirmBtn = modal.querySelector('#debug-confirm');
      var headerDot = header.querySelector('span');
      var confirmLabel = data.applySupported ? 'Apply' : 'Confirm';

      return {
        updateAnswer: function (answer) {
          if (!answer) {
            answerEl.innerHTML =
              '<div style="display:flex;align-items:center;gap:10px;">' +
              '<span style="color:#909399;">No answer from AI</span>' +
              '</div>';
            confirmBtn.textContent = confirmLabel;
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            if (headerDot) headerDot.style.background = '#909399';
            return;
          }

          answerEl.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;">' +
            '<span style="font-weight:bold;">AI Suggestion:</span>' +
            '<span style="font-size:1.4em;font-weight:bold;color:#409eff;">' + answer + '</span>' +
            '</div>';
          answerEl.style.background = '#ecf5ff';

          var optionsEls = modal.querySelectorAll('.ea-debug-option');
          for (var i = 0; i < optionsEls.length; i++) {
            var opt = optionsEls[i];
            var letter = opt.getAttribute('data-letter');
            if (answer.indexOf(letter) !== -1) {
              opt.style.background = '#f0f9eb';
              opt.style.border = '1px solid #67c23a';
              opt.style.color = '#67c23a';
            }
          }

          confirmBtn.textContent = confirmLabel;
          confirmBtn.disabled = false;
          confirmBtn.style.opacity = '1';
          if (headerDot) headerDot.style.background = '#67c23a';
        },
        confirmPromise: confirmPromise
      };
    });
  },

  createSelectionModal(questions) {
    try {
      this.injectStyles();

      var existing = document.getElementById('ea-selection-modal');
      if (existing) existing.remove();

      var modal = document.createElement('div');
      modal.id = 'ea-selection-modal';

      var header = document.createElement('div');
      header.className = 'ea-header';
      header.innerHTML = '<div class="ea-title">Selection Results</div><div class="ea-close" aria-label="close">\u00d7</div>';
      modal.appendChild(header);

      var list = document.createElement('div');
      list.id = 'ea-selection-list';

      questions.forEach(function (q) {
        var item = document.createElement('div');
        item.className = 'ea-item';
        item.id = 'ea-s-' + q.id;
        item.innerHTML =
          '<div style="font-weight:600;color:#111;">' + q.question.slice(0, 300) + '</div>' +
          '<div class="ea-meta">Type: ' + q.type + (q.applySupported ? ' \u00b7 AutoApply' : '') + '</div>' +
          '<div style="margin-top:8px;">AI: <span class="ea-ai">-</span></div>' +
          '<div class="ea-actions">' +
          '<button class="ea-btn ea-btn-ai">Request AI</button>' +
          '<button class="ea-btn ea-btn-copy">Copy</button>' +
          '<button class="ea-btn ea-btn-apply"' + (q.applySupported ? '' : ' disabled') + '>Apply</button>' +
          '</div>';
        list.appendChild(item);
      });

      modal.appendChild(list);
      document.body.appendChild(modal);

      requestAnimationFrame(function () { modal.classList.add('ea-open'); });

      var isClosing = false;
      var cleanup = function () {
        document.removeEventListener('mousedown', onDocDown);
        document.removeEventListener('touchstart', onDocDown);
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);
      };

      var closeWithAnimation = function () {
        if (isClosing) return;
        isClosing = true;
        modal.classList.remove('ea-open');
        var onEnd = function () {
          cleanup();
          if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
          modal.removeEventListener('transitionend', onEnd);
        };
        modal.addEventListener('transitionend', onEnd);
        setTimeout(function () {
          if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
          cleanup();
        }, 400);
      };

      var onDocDown = function (e) {
        try {
          if (!modal.contains(e.target)) closeWithAnimation();
        } catch (err) { /* ignore */ }
      };

      document.addEventListener('mousedown', onDocDown);
      document.addEventListener('touchstart', onDocDown);

      header.querySelector('.ea-close').addEventListener('click', closeWithAnimation);

      var dragging = false;
      var dragOffsetX = 0, dragOffsetY = 0;
      var onDragStart = function (evt) {
        dragging = true;
        var rect = modal.getBoundingClientRect();
        var clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
        var clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
        dragOffsetX = clientX - rect.left;
        dragOffsetY = clientY - rect.top;
        modal.style.transition = 'none';
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('touchend', onDragEnd);
      };
      var onDragMove = function (evt) {
        if (!dragging) return;
        evt.preventDefault();
        var clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
        var clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
        var left = clientX - dragOffsetX;
        var top = clientY - dragOffsetY;
        var pad = 8;
        var w = modal.offsetWidth, h = modal.offsetHeight;
        left = Math.max(pad, Math.min(window.innerWidth - w - pad, left));
        top = Math.max(pad, Math.min(window.innerHeight - h - pad, top));
        modal.style.left = left + 'px';
        modal.style.top = top + 'px';
        modal.style.right = 'auto';
        modal.style.transform = 'none';
        modal.style.opacity = '1';
      };
      var onDragEnd = function () {
        dragging = false;
        modal.style.transition = '';
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);
      };
      header.addEventListener('mousedown', onDragStart);
      header.addEventListener('touchstart', onDragStart, { passive: true });

      list.querySelectorAll('.ea-btn-ai').forEach(function (btn, idx) {
        btn.addEventListener('click', function () {
          var q = questions[idx];
          chrome.runtime.sendMessage({ action: EA.Actions.GET_AI_ANSWERS_BATCH, data: [q] }, function (resp) {
            if (resp && resp.results && resp.results[0]) {
              var r = resp.results[0];
              var el = document.querySelector('#ea-s-' + q.id);
              if (el) el.querySelector('.ea-ai').textContent = r.answer || (r.error ? 'Error: ' + r.error : '');
            }
          });
        });
      });

      list.querySelectorAll('.ea-btn-copy').forEach(function (btn, idx) {
        btn.addEventListener('click', function () {
          var q = questions[idx];
          var el = document.querySelector('#ea-s-' + q.id);
          var ai = el ? el.querySelector('.ea-ai').textContent.trim() : '';
          if (ai) navigator.clipboard.writeText(ai);
        });
      });

      list.querySelectorAll('.ea-btn-apply').forEach(function (btn, idx) {
        btn.addEventListener('click', function () {
          var q = questions[idx];
          var el = document.querySelector('#ea-s-' + q.id);
          var ai = el ? el.querySelector('.ea-ai').textContent.trim() : '';
          if (!ai) return;
          chrome.runtime.sendMessage({
            action: EA.Actions.APPLY_ANSWERS_BATCH,
            data: [{ id: q.id, answer: ai }]
          }, function (resp) {
            if (resp && resp.results && resp.results[0]) {
              btn.textContent = resp.results[0].success ? 'Applied' : 'Failed';
            }
          });
        });
      });
    } catch (e) {
      console.error('[EA] showSelectionResultsModal error', e);
    }
  },

  setupSelectionIcon(onExtract) {
    var icon = null;

    function removeIcon() {
      if (icon && icon.parentNode) icon.parentNode.removeChild(icon);
      icon = null;
    }

    function onMouseUp(e) {
      setTimeout(function () {
        var sel = window.getSelection();
        if (!sel || sel.isCollapsed) { removeIcon(); return; }
        var text = sel.toString().trim();
        if (!text || text.length < 6) { removeIcon(); return; }

        var range = sel.getRangeAt(0);
        var rect = range.getBoundingClientRect();

        removeIcon();
        icon = document.createElement('div');
        icon.id = 'ea-selection-icon';
        icon.style.cssText = 'position:fixed;left:' + (rect.right - 28) + 'px;top:' + Math.max(8, rect.top - 36) + 'px;width:28px;height:28px;background:#409EFF;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:1000005;cursor:pointer;box-shadow:0 6px 18px rgba(64,158,255,0.18);';
        icon.title = 'Search question (AI)';
        icon.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM10 14a4 4 0 110-8 4 4 0 010 8z"/></svg>';

        document.body.appendChild(icon);

        icon.onclick = function (ev) {
          ev.stopPropagation();
          ev.preventDefault();
          var selRange = range.cloneRange();
          var data = onExtract(selRange);
          removeIcon();
          if (data && data.length) {
            EA.UI.createSelectionModal(data);
          } else {
            EA.UI.createSelectionModal([{
              id: 'sel-raw-0',
              index: 0,
              question: selRange.toString().trim(),
              type: 'unknown',
              options: [],
              applySupported: false
            }]);
          }
        };

        setTimeout(function () {
          var onDocClick = function (ev) { if (!icon.contains(ev.target)) removeIcon(); };
          document.addEventListener('click', onDocClick, { once: true });
        }, 50);
      }, 10);
    }

    document.addEventListener('mouseup', onMouseUp);
  }
};
