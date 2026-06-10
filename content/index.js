if (!window.hasExamAssistantRunning) {
  window.hasExamAssistantRunning = true;

  var assistant = new EA.Assistant();

  if (assistant.statusPanel) {
    assistant.statusPanel.btnCopy.onclick = function (e) {
      e.stopPropagation();
      assistant.copyQuestion();
    };
    assistant.statusPanel.btnStart.onclick = function (e) {
      e.stopPropagation();
      assistant.start();
    };
    assistant.statusPanel.btnPause.onclick = function (e) {
      e.stopPropagation();
      assistant.stop();
    };
    assistant.statusPanel.btnNext.onclick = function (e) {
      e.stopPropagation();
      EA.Navigator.goToNextQuestion(function (msg) { assistant.updateStatus(msg); });
    };
    assistant.statusPanel.btnAuto.onclick = function (e) {
      e.stopPropagation();
      assistant.toggleAutoMode();
    };

    chrome.storage.sync.get([EA.StorageKeys.SHOW_FLOATING_WIDGET], function (res) {
      if (res[EA.StorageKeys.SHOW_FLOATING_WIDGET] === false) {
        assistant.statusPanel.hide();
      }
    });

    chrome.storage.onChanged.addListener(function (changes, areaName) {
      if (areaName === 'sync' && changes[EA.StorageKeys.SHOW_FLOATING_WIDGET]) {
        var val = changes[EA.StorageKeys.SHOW_FLOATING_WIDGET].newValue;
        if (val === false) {
          assistant.statusPanel.hide();
        } else {
          assistant.statusPanel.show();
        }
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.altKey && e.key.toLowerCase() === 't') {
      console.log('[ExamAssistant] Shortcut Alt+T triggered');
      if (assistant.isRunning) {
        assistant.stop();
      } else {
        assistant.start();
      }
    } else if (e.altKey && e.key.toLowerCase() === 'm') {
      console.log('[ExamAssistant] Shortcut Alt+M triggered - Copy question');
      e.preventDefault();
      assistant.copyQuestion();
    } else if (e.altKey && e.key.toLowerCase() === 'd') {
      console.log('[ExamAssistant] Shortcut Alt+D triggered - Start without Debug Mode');
      e.preventDefault();
      if (assistant.isRunning) {
        assistant.stop();
      } else {
        assistant.startWithoutDebug();
      }
    } else if (e.altKey && e.key.toLowerCase() === 'q') {
      console.log('[ExamAssistant] Shortcut Alt+Q triggered - Box Selection Mode');
      e.preventDefault();
      EA.BoxSelect.activate();
    }
  });

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === EA.Actions.START_ANSWERING) {
      assistant.start();
    } else if (request.action === EA.Actions.STOP_ANSWERING) {
      assistant.stop();
    } else if (request.action === EA.Actions.GET_ALL_QUESTIONS) {
      try {
        var qs = EA.Extractor.extractAllQuestions();
        sendResponse({ questions: qs });
      } catch (e) {
        sendResponse({ questions: [], error: e && e.message });
      }
    } else if (request.action === EA.Actions.APPLY_ANSWERS_BATCH) {
      var answers = request.data || [];
      var results = EA.Applicator.applyBatchAnswers(answers);
      sendResponse({ results: results });
    } else if (request.action === EA.Actions.HIGHLIGHT_QUESTION) {
      try {
        var res = EA.Applicator.highlightQuestionById(request.id);
        sendResponse(res);
      } catch (e) {
        sendResponse({ success: false, error: e && e.message });
      }
    } else if (request.action === EA.Actions.START_AREA_SELECT) {
      try {
        var areaQuestions = EA.Extractor.extractAllQuestions();
        sendResponse({ questions: areaQuestions });
      } catch (e) {
        sendResponse({ error: e && e.message });
      }
    }
  });

  EA.UI.setupSelectionIcon(function (range) {
    return EA.Extractor.extractFromSelection(range);
  });
}
