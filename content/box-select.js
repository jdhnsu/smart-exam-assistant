var EA = typeof EA !== 'undefined' ? EA : {};

EA.BoxSelect = {
  _active: false,
  _overlay: null,
  _selectionDiv: null,
  _startX: 0,
  _startY: 0,
  _boundMouseMove: null,
  _boundMouseUp: null,
  _boundKeyDown: null,
  _cancelled: false,

  activate: function () {
    if (this._active) return;
    this._active = true;

    var self = this;

    this._overlay = document.createElement('div');
    this._overlay.id = 'ea-box-select-overlay';
    this._overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
      'background:rgba(64,158,255,0.06);z-index:1000003;cursor:crosshair;';
    document.body.appendChild(this._overlay);

    this._selectionDiv = null;

    this._boundMouseDown = function (e) { self._onMouseDown(e); };
    this._boundMouseMove = function (e) { self._onMouseMove(e); };
    this._boundMouseUp = function (e) { self._onMouseUp(e); };
    this._boundKeyDown = function (e) { self._onKeyDown(e); };
    this._boundContextMenu = function (e) { self._onContextMenu(e); };

    this._overlay.addEventListener('mousedown', this._boundMouseDown);
    this._overlay.addEventListener('contextmenu', this._boundContextMenu);
    document.addEventListener('keydown', this._boundKeyDown, { capture: true });

    EA.Utils.storageGetLocal(['ea_box_select_hint']).then(function (res) {
      if (!res.ea_box_select_hint) {
        var hint = document.createElement('div');
        hint.id = 'ea-box-select-hint';
        hint.style.cssText =
          'position:fixed;top:12px;left:50%;transform:translateX(-50%);' +
          'background:rgba(64,158,255,0.92);color:#fff;padding:10px 22px;' +
          'border-radius:8px;font-size:14px;font-weight:600;z-index:1000007;' +
          'box-shadow:0 4px 16px rgba(64,158,255,0.25);pointer-events:none;' +
          'font-family:system-ui,-apple-system,sans-serif;';
        hint.textContent = 'Draw a box around the question  |  Esc to cancel';
        document.body.appendChild(hint);
        setTimeout(function () {
          if (hint.parentNode) {
            hint.style.transition = 'opacity 0.4s ease';
            hint.style.opacity = '0';
            setTimeout(function () { if (hint.parentNode) hint.parentNode.removeChild(hint); }, 400);
          }
        }, 3000);
        EA.Utils.storageSetLocal({ ea_box_select_hint: 1 });
      }
    });
  },

  deactivate: function () {
    if (!this._active) return;
    this._active = false;

    if (this._overlay && this._overlay.parentNode) {
      this._overlay.removeEventListener('mousedown', this._boundMouseDown);
      this._overlay.removeEventListener('contextmenu', this._boundContextMenu);
      this._overlay.parentNode.removeChild(this._overlay);
    }
    this._overlay = null;
    this._removeSelectionDiv();
    document.removeEventListener('keydown', this._boundKeyDown, { capture: true });
    document.removeEventListener('mousemove', this._boundMouseMove);
    document.removeEventListener('mouseup', this._boundMouseUp);

    console.log('[ExamAssistant] Box selection deactivated');
  },

  _removeSelectionDiv: function () {
    if (this._selectionDiv && this._selectionDiv.parentNode) {
      this._selectionDiv.parentNode.removeChild(this._selectionDiv);
    }
    this._selectionDiv = null;
  },

  _onMouseDown: function (e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    this._startX = e.clientX;
    this._startY = e.clientY;

    this._selectionDiv = document.createElement('div');
    this._selectionDiv.id = 'ea-box-select-rect';
    this._selectionDiv.style.cssText =
      'position:fixed;left:' + this._startX + 'px;top:' + this._startY + 'px;' +
      'width:0;height:0;background:rgba(64,158,255,0.08);' +
      'border:2px dashed #409EFF;z-index:1000004;pointer-events:none;border-radius:2px;';
    document.body.appendChild(this._selectionDiv);

    document.addEventListener('mousemove', this._boundMouseMove);
    document.addEventListener('mouseup', this._boundMouseUp);
  },

  _onMouseMove: function (e) {
    if (!this._selectionDiv) return;
    e.preventDefault();

    var x = Math.min(e.clientX, this._startX);
    var y = Math.min(e.clientY, this._startY);
    var w = Math.abs(e.clientX - this._startX);
    var h = Math.abs(e.clientY - this._startY);

    this._selectionDiv.style.left = x + 'px';
    this._selectionDiv.style.top = y + 'px';
    this._selectionDiv.style.width = w + 'px';
    this._selectionDiv.style.height = h + 'px';
  },

  _onMouseUp: function (e) {
    document.removeEventListener('mousemove', this._boundMouseMove);
    document.removeEventListener('mouseup', this._boundMouseUp);

    if (!this._selectionDiv) return;

    var rect = this._selectionDiv.getBoundingClientRect();
    var minSize = 20;
    if (rect.width < minSize || rect.height < minSize) {
      this.deactivate();
      return;
    }

    this._cancelled = false;
    this._removeSelectionDiv();
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
    }
    this._overlay = null;

    var self = this;
    setTimeout(function () {
      if (self._cancelled) {
        self._finalCleanup();
        return;
      }
      self._finalCleanup();
      self._extractAndProcess(rect);
    }, 50);
  },

  _finalCleanup: function () {
    document.removeEventListener('keydown', this._boundKeyDown, { capture: true });
    this._active = false;
  },

  _onKeyDown: function (e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this._cancelled = true;
      this.deactivate();
    }
  },

  _onContextMenu: function (e) {
    e.preventDefault();
    this.deactivate();
  },

  _extractAndProcess: function (rect) {
    try {
      var parsed = this._extractStructuredFromRect(rect);
      if (!parsed) {
        this._showStatus('No readable text found in the selected area');
        return;
      }
      if (!parsed.question || parsed.question.length < 2) {
        this._showStatus('Could not identify a question in the selected area');
        return;
      }

      console.log('[ExamAssistant] Box select extracted:', {
        questionPreview: parsed.question.slice(0, 120),
        optionCount: parsed.options.length,
        type: parsed.type
      });

      this._sendToAIAndShow(parsed);
    } catch (err) {
      console.error('[ExamAssistant] Box select extraction error:', err);
      this._showStatus('Error extracting text: ' + (err.message || err));
    }
  },

  _extractStructuredFromRect: function (userRect) {
    var questionBoxes = document.querySelectorAll(EA.Selectors.QUESTION_BOX);
    if (questionBoxes && questionBoxes.length > 0) {
      var matched = [];
      for (var i = 0; i < questionBoxes.length; i++) {
        var box = questionBoxes[i];
        var boxRect = box.getBoundingClientRect();
        if (boxRect.width === 0 || boxRect.height === 0) continue;
        if (!this._rectOverlaps(boxRect, userRect)) continue;
        var data = EA.Extractor.extractQuestionData(box);
        if (data && data.question) {
          matched.push({ data: data, top: boxRect.top });
        }
      }

      if (matched.length > 0) {
        matched.sort(function (a, b) { return a.top - b.top; });
        if (matched.length === 1) {
          var m = matched[0].data;
          return { question: m.question, options: m.options, type: m.type, applySupported: false };
        }
        var combinedQuestion = '';
        var combinedOptions = [];
        var combinedType = 'radio';
        for (var j = 0; j < matched.length; j++) {
          var d = matched[j].data;
          combinedQuestion += (combinedQuestion ? '\n---\n' : '') + d.question;
          for (var k = 0; k < d.options.length; k++) {
            combinedOptions.push(d.options[k]);
          }
          if (d.type === 'checkbox') combinedType = 'checkbox';
        }
        return { question: combinedQuestion, options: combinedOptions, type: combinedType, applySupported: false };
      }
    }

    var rawText = this._extractTextFromRect(userRect);
    if (!rawText || rawText.length < 3) return null;
    return this._parseTextToQuestion(rawText);
  },

  _showStatus: function (msg) {
    var el = document.createElement('div');
    el.style.cssText =
      'position:fixed;top:12px;left:50%;transform:translateX(-50%);' +
      'background:rgba(245,108,108,0.92);color:#fff;padding:10px 22px;' +
      'border-radius:8px;font-size:14px;font-weight:600;z-index:1000007;' +
      'box-shadow:0 4px 16px rgba(245,108,108,0.25);pointer-events:none;' +
      'font-family:system-ui,-apple-system,sans-serif;';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) {
        el.style.transition = 'opacity 0.4s ease';
        el.style.opacity = '0';
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
      }
    }, 2500);
  },

  _extractTextFromRect: function (userRect) {
    var results = [];
    var skipSelector =
      '#ea-box-select-overlay, #ea-box-select-rect, #ea-box-select-hint, ' +
      '#ea-box-select-loading, #ai-exam-debug-modal, #ai-exam-assistant-status, ' +
      '#ea-selection-modal, #ea-selection-icon';
    var skipTags = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, SVG: 1, IFRAME: 1, OBJECT: 1, BR: 1, HR: 1, META: 1, LINK: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1 };

    var allElements = document.querySelectorAll('*');
    for (var i = 0; i < allElements.length; i++) {
      var el = allElements[i];
      if (skipTags[el.tagName]) continue;
      if (el.closest(skipSelector)) continue;

      var rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      var overlapArea = this._rectOverlapArea(rect, userRect);
      var elArea = rect.width * rect.height;
      if (elArea === 0) continue;
      if (overlapArea < elArea * 0.4) continue;

      if (rect.width > userRect.width * 4 || rect.height > userRect.height * 4) continue;

      if (el.children.length > 20) continue;

      var style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;

      var text = (el.innerText || '').trim();
      if (!text || text.length < 1 || text.length > 600) continue;

      results.push({ text: text, top: rect.top, left: rect.left, overlap: overlapArea });
    }

    var textMap = {};
    for (var j = 0; j < results.length; j++) {
      var r = results[j];
      if (!textMap[r.text] || textMap[r.text].overlap < r.overlap) {
        textMap[r.text] = r;
      }
    }

    var deduped = [];
    for (var key in textMap) {
      if (textMap.hasOwnProperty(key)) {
        deduped.push(textMap[key]);
      }
    }

    deduped.sort(function (a, b) {
      if (Math.abs(a.top - b.top) < 8) return a.left - b.left;
      return a.top - b.top;
    });

    return deduped.map(function (r) { return r.text; }).join('\n');
  },

  _rectOverlapArea: function (r1, r2) {
    var xOverlap = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
    var yOverlap = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
    return xOverlap * yOverlap;
  },

  _rectOverlaps: function (r1, r2) {
    if (r1.width === 0 || r1.height === 0) return false;
    return !(r2.left >= r1.right ||
             r2.right <= r1.left ||
             r2.top >= r1.bottom ||
             r2.bottom <= r1.top);
  },

  _parseTextToQuestion: function (rawText) {
    var lines = rawText.split('\n');
    var cleanedLines = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      if (line) cleanedLines.push(line);
    }

    var parsed = EA.Utils.parseOptionsFromLines(cleanedLines);
    var options = parsed.options;
    var stemLines = parsed.stemLines;

    var questionText = stemLines.join('\n').trim();
    if (!questionText && cleanedLines.length > 0) {
      questionText = '(Options only, no separate question stem)';
    }

    var type = 'radio';
    if (questionText && questionText.length > 0) {
      var combined = questionText.toLowerCase();
      if (combined.includes('多选') || combined.includes('多项') || combined.includes('select all') ||
          combined.includes('multiple')) {
        type = 'checkbox';
      }
    }

    if (options.length === 0 && questionText.length > 0) {
      type = 'short-answer';
    }

    return {
      question: questionText,
      options: options,
      type: type,
      applySupported: false
    };
  },

  _sendToAIAndShow: function (data) {
    var self = this;
    
    // 标记来源为 box-select
    data.source = 'box-select';
    
    // 创建简洁的问答弹窗
    EA.UI.createSimpleAnswerModal('Box Selection Result', data);
    
    // 发送 AI 请求
    EA.Utils.fetchSingleAnswer(data).then(function (answer) {
      // 直接在弹窗中显示 AI 的原始回答
      self._displayAnswer(answer);
    }).catch(function (err) {
      self._displayError(err);
    });
  },

  _displayAnswer: function (answer) {
    var answerEl = document.querySelector('#ea-simple-answer-text');
    if (answerEl) {
      // 移除加载动画
      var loadingEl = document.querySelector('#ea-simple-loading');
      if (loadingEl) loadingEl.style.display = 'none';
      
      // 显示答案
      answerEl.textContent = answer || 'No answer from AI';
      answerEl.style.display = 'block';
    }
  },

  _displayError: function (err) {
    var answerEl = document.querySelector('#ea-simple-answer-text');
    if (answerEl) {
      var loadingEl = document.querySelector('#ea-simple-loading');
      if (loadingEl) loadingEl.style.display = 'none';
      
      answerEl.textContent = 'Error: ' + (err && err.message ? err.message : err);
      answerEl.style.color = '#f56c6c';
      answerEl.style.display = 'block';
    }
  }
};
