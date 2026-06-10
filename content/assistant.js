var EA = typeof EA !== 'undefined' ? EA : {};

EA.Assistant = function () {
  this.isRunning = false;
  this.statusPanel = null;
  this._lastCopiedQuestion = null;
  this._skipDebugMode = false;

  this.statusPanel = EA.UI.createStatusPanel();
  EA.AutoMode.init().then(function () {
    if (this.statusPanel) this.statusPanel.updateAutoButtonState(EA.AutoMode.isEnabled());
  }.bind(this));
};

EA.Assistant.prototype.updateStatus = function (text) {
  if (this.statusPanel) this.statusPanel.updateStatus(text);
};

EA.Assistant.prototype.start = function () {
  if (this.isRunning) return;
  this.isRunning = true;
  this._skipDebugMode = false;
  this.updateStatus(EA.AutoMode.isEnabled() ? 'Started (Auto)' : 'Started');
  if (this.statusPanel) this.statusPanel.showRunning();
  this.processLoop();
};

EA.Assistant.prototype.startWithoutDebug = function () {
  if (this.isRunning) return;
  this.isRunning = true;
  this._skipDebugMode = true;
  this.updateStatus(EA.AutoMode.isEnabled() ? 'Started (Auto, Debug Disabled)' : 'Started (Debug Mode Disabled)');
  if (this.statusPanel) this.statusPanel.showRunning();
  this.processLoop();
};

EA.Assistant.prototype.stop = function () {
  this.isRunning = false;
  this._skipDebugMode = false;
  this.updateStatus('Paused');
  if (this.statusPanel) this.statusPanel.showStopped();
};

EA.Assistant.prototype.processLoop = function () {
  if (!this.isRunning) return;

  var self = this;
  var questionEl = EA.Extractor.findCurrentQuestion();
  if (!questionEl) {
    this.updateStatus('No visible question found. Waiting...');
    setTimeout(function () { self.processLoop(); }, 2000);
    return;
  }

  questionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

  this.updateStatus('Extracting question data...');
  var data = EA.Extractor.extractQuestionData(questionEl);
  if (!data) {
    this.updateStatus('Failed to extract question data');
    this.stop();
    return;
  }
  data.applySupported = true;

  var currentSignature = EA.Extractor.getQuestionSignature(questionEl, data);

  if (data.type === 'short-answer' && !data.inputElement) {
    this.updateStatus('No input field found for short answer');
    this.stop();
    return;
  }

  if (data.type !== 'short-answer' && !data.options.length) {
    this.updateStatus('Failed to extract question options');
    this.stop();
    return;
  }

  this.autoCopyShortAnswer(questionEl);

  try {
    self.updateStatus('Thinking (AI)...');

    var debugModal = null;
    var aiAnswer = null;
    self.isDebugMode().then(function (debugEnabled) {
      if (debugEnabled) {
        EA.UI.createDebugModalLive('Debug: Verify Answer', data).then(function (live) {
          debugModal = live;
          self.fetchAnswer(data).then(function (answer) {
            aiAnswer = answer;
            if (!answer) throw new Error('AI returned empty answer');
            debugModal.updateAnswer(answer);
            return debugModal.confirmPromise;
          }).then(function (confirmed) {
            if (!confirmed) {
              self.updateStatus('Stopped by user after AI answer');
              self.stop();
              return;
            }
            self.applyAndContinue(data, aiAnswer, currentSignature);
          }).catch(function (err) {
            self.updateStatus('Error: ' + (err.message || err));
            self.stop();
          });
        });
      } else {
        self.fetchAnswer(data).then(function (answer) {
          if (!answer) throw new Error('AI returned empty answer');
          self.applyAndContinue(data, answer, currentSignature);
        }).catch(function (err) {
          self.updateStatus('Error: ' + (err.message || err));
          self.stop();
        });
      }
    });
  } catch (err) {
    this.updateStatus('Error: ' + (err.message || err));
    this.stop();
  }
};

EA.Assistant.prototype.applyAndContinue = function (data, answer, currentSignature) {
  this.updateStatus('AI chose: ' + answer);

  var success;
  if (data.type === 'short-answer') {
    success = EA.Applicator.fillAnswer(data.inputElement, answer);
  } else {
    success = EA.Applicator.selectOption(data, answer);
  }

  if (success) {
    if (EA.AutoMode.isEnabled()) {
      var msg = data.type === 'short-answer' ? 'Answer filled. Auto: waiting before next...' : 'Answered. Auto: waiting before next...';
      this.updateStatus(msg);
      this.continueAutoFlow(currentSignature);
    } else {
      var msg2 = data.type === 'short-answer' ? 'Answer filled. Click Next manually.' : 'Answered. Click Next manually.';
      this.updateStatus(msg2);
      this.stop();
    }
  } else {
    var errorMsg = data.type === 'short-answer' ? 'Could not fill answer' : 'Could not select option ' + answer;
    this.updateStatus(errorMsg);
    this.stop();
  }
};

EA.Assistant.prototype.continueAutoFlow = function (previousSignature) {
  if (!this.isRunning) return;
  var self = this;

  EA.Utils.sleep(EA.AutoMode.getAutoNextDelay()).then(function () {
    if (!self.isRunning) return;

    var moved = EA.Navigator.goToNextQuestion(function (msg, color) { self.updateStatus(msg); });
    if (!moved) {
      self.updateStatus('Auto stopped: could not find next question button');
      self.stop();
      return;
    }

    return EA.Navigator.waitForQuestionChange(previousSignature, function () { return self.isRunning; });
  }).then(function (changed) {
    if (!self.isRunning) return;
    if (!changed) {
      self.updateStatus('Auto stopped: next question did not load');
      self.stop();
      return;
    }

    self.updateStatus('Auto: question loaded, continuing...');
    EA.Utils.sleep(EA.AutoMode.getAutoSettleDelay()).then(function () {
      if (!self.isRunning) return;
      setTimeout(function () { self.processLoop(); }, 0);
    });
  });
};

EA.Assistant.prototype.fetchAnswer = function (data) {
  return EA.Utils.fetchSingleAnswer(data);
};

EA.Assistant.prototype.isDebugMode = function () {
  if (this._skipDebugMode || EA.AutoMode.isEnabled()) {
    return Promise.resolve(false);
  }
  return EA.Utils.storageGet([EA.StorageKeys.DEBUG_MODE]).then(function (result) {
    return !!result[EA.StorageKeys.DEBUG_MODE];
  });
};

EA.Assistant.prototype.autoCopyShortAnswer = function (questionEl) {
  var typeInfo = EA.Extractor.getQuestionType(questionEl);
  if (typeInfo.isShortAnswer && !this._lastCopiedQuestion) {
    var textEl = questionEl.querySelector(EA.Selectors.QUESTION_TEXT);
    if (textEl) {
      var questionText = textEl.innerText.replace(/\s+/g, ' ').trim();
      var self = this;
      navigator.clipboard.writeText(questionText).then(function () {
        console.log('[ExamAssistant] Auto-copied short answer question to clipboard');
        self._lastCopiedQuestion = questionText;
        if (self.statusPanel) {
          self.statusPanel.statusDot.style.background = 'rgba(103, 194, 58, 0.3)';
          self.statusPanel.statusDot.style.boxShadow = '0 0 8px rgba(103, 194, 58, 0.5)';
          setTimeout(function () {
            if (self.statusPanel) {
              self.statusPanel.statusDot.style.background = 'rgba(64, 158, 255, 0.15)';
              self.statusPanel.statusDot.style.boxShadow = '0 0 6px rgba(64, 158, 255, 0.3)';
            }
          }, 1000);
        }
      }).catch(function (err) {
        console.error('[ExamAssistant] Auto-copy failed:', err);
      });
    }
  } else if (!typeInfo.isShortAnswer) {
    this._lastCopiedQuestion = null;
  }
};

EA.Assistant.prototype.copyQuestion = function () {
  try {
    var questionEl = EA.Extractor.findCurrentQuestion();
    if (!questionEl) {
      this.updateStatus('No question found to copy');
      return;
    }
    var textEl = questionEl.querySelector(EA.Selectors.QUESTION_TEXT);
    if (!textEl) {
      this.updateStatus('Could not extract question text');
      return;
    }
    var questionText = textEl.innerText.replace(/\s+/g, ' ').trim();
    var self = this;
    navigator.clipboard.writeText(questionText).then(function () {
      self.updateStatus('Question copied!');
      setTimeout(function () { self.updateStatus('AI Ready'); }, 2000);
    }).catch(function (err) {
      console.error('[EA] Copy failed:', err);
      self.updateStatus('Copy failed: ' + err.message);
    });
  } catch (err) {
    console.error('[EA] Copy failed:', err);
    this.updateStatus('Copy failed: ' + err.message);
  }
};

EA.Assistant.prototype.toggleAutoMode = function () {
  var self = this;
  EA.AutoMode.toggle().then(function (newValue) {
    if (self.statusPanel) self.statusPanel.updateAutoButtonState(newValue);
    self.updateStatus(newValue ? 'Auto mode enabled' : 'Auto mode disabled');
  });
};
