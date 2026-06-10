document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.sync.get(['provider', 'apiKey', 'apiUrl', 'modelName', 'debugMode', 'shortAnswerPrompt', 'boxSelectPrompt', 'showFloatingWidget'], function (result) {
    if (result.provider) document.getElementById('provider').value = result.provider;
    if (result.apiKey) document.getElementById('apiKey').value = result.apiKey;
    if (result.apiUrl) document.getElementById('apiUrl').value = result.apiUrl;
    if (result.modelName) document.getElementById('modelName').value = result.modelName;
    if (result.debugMode) document.getElementById('debugMode').checked = result.debugMode;
    if (result.shortAnswerPrompt) document.getElementById('shortAnswerPrompt').value = result.shortAnswerPrompt;
    if (result.boxSelectPrompt) document.getElementById('boxSelectPrompt').value = result.boxSelectPrompt;
    if (result.showFloatingWidget !== undefined) document.getElementById('showFloatingWidget').checked = result.showFloatingWidget;
  });

  document.getElementById('saveBtn').addEventListener('click', function () {
    var provider = document.getElementById('provider').value;
    var apiKey = document.getElementById('apiKey').value;
    var apiUrl = document.getElementById('apiUrl').value.trim();
    var modelName = document.getElementById('modelName').value;
    var debugMode = document.getElementById('debugMode').checked;
    var shortAnswerPrompt = document.getElementById('shortAnswerPrompt').value.trim();
    var boxSelectPrompt = document.getElementById('boxSelectPrompt').value.trim();
    var showFloatingWidget = document.getElementById('showFloatingWidget').checked;

    if (!apiKey) {
      showStatus('Please enter an API Key', 'red');
      return;
    }

    chrome.storage.sync.set({ 
      provider: provider, 
      apiKey: apiKey, 
      apiUrl: apiUrl, 
      modelName: modelName, 
      debugMode: debugMode, 
      shortAnswerPrompt: shortAnswerPrompt,
      boxSelectPrompt: boxSelectPrompt,
      showFloatingWidget: showFloatingWidget
    }, function () {
      showStatus('Settings Saved!', 'green');
    });
  });

  var testBtn = document.getElementById('testBtn');
  if (testBtn) {
    testBtn.addEventListener('click', function () {
      var provider = document.getElementById('provider').value;
      var apiKey = document.getElementById('apiKey').value;
      var apiUrl = document.getElementById('apiUrl').value.trim();
      var modelName = document.getElementById('modelName').value;

      if (!apiKey) {
        showTestResult('Please enter an API Key first', 'red');
        return;
      }

      showTestResult('Testing connection...', '#E6A23C');
      testBtn.disabled = true;
      testBtn.textContent = 'Testing...';

      chrome.runtime.sendMessage({ 
        action: 'TEST_CONNECTION', 
        data: { provider: provider, apiKey: apiKey, apiUrl: apiUrl, modelName: modelName } 
      }, function (response) {
        testBtn.disabled = false;
        testBtn.textContent = 'Test Connection';
        
        if (response && response.success) {
          showTestResult('✓ Connection successful!\n\nResponse: ' + response.answer.substring(0, 200), 'green');
        } else {
          showTestResult('✗ Connection failed\n\nError: ' + (response && response.error ? response.error : 'Unknown error'), 'red');
        }
      });
    });
  }

  var fetchBtn = document.getElementById('fetchQuestions');
  if (fetchBtn) {
    fetchBtn.addEventListener('click', function () {
      showStatus('Requesting questions from page...', '#409EFF');
      getActiveTab().then(function (tab) {
        if (!tab) { showStatus('No active tab', 'red'); return; }
        chrome.tabs.sendMessage(tab.id, { action: 'GET_ALL_QUESTIONS' }, function (resp) {
          if (chrome.runtime.lastError) {
            showStatus('Content script not available on this page', 'red');
            return;
          }
          var qs = resp && resp.questions ? resp.questions : [];
          renderQuestions(qs);
          showStatus('Found ' + qs.length + ' questions', 'black');
        });
      });
    });
  }

  var selectBtn = document.getElementById('selectOnPage');
  if (selectBtn) {
    selectBtn.addEventListener('click', function () {
      showStatus('Activate selection on page...', '#409EFF');
      getActiveTab().then(function (tab) {
        if (!tab) { showStatus('No active tab', 'red'); return; }
        chrome.tabs.sendMessage(tab.id, { action: 'START_AREA_SELECT' }, function (resp) {
          if (chrome.runtime.lastError) {
            showStatus('Content script not available on this page', 'red');
            return;
          }
          if (resp && resp.cancelled) { showStatus('Selection cancelled', 'black'); return; }
          var qs = resp && resp.questions ? resp.questions : [];
          renderQuestions(qs);
          showStatus('Selection returned ' + qs.length + ' questions', 'black');
        });
      });
    });
  }

  var aiBtn = document.getElementById('batchAI');
  if (aiBtn) {
    aiBtn.addEventListener('click', function () {
      var selected = getSelectedQuestions();
      if (!selected.length) { showStatus('No questions selected', 'red'); return; }
      showStatus('Requesting AI answers...', '#E6A23C');
      chrome.runtime.sendMessage({ action: 'GET_AI_ANSWERS_BATCH', data: selected }, function (resp) {
        if (resp && resp.results) {
          resp.results.forEach(function (r) {
            var el = document.querySelector('#qa-' + r.id);
            if (el) el.querySelector('.qa-answer').textContent = r.answer || (r.error ? 'Error: ' + r.error : '');
          });
          showStatus('AI answers returned', 'green');
        } else {
          showStatus(resp && resp.error ? resp.error : 'Batch AI error', 'red');
        }
      });
    });
  }

  var applyBtn = document.getElementById('applySelected');
  if (applyBtn) {
    applyBtn.addEventListener('click', function () {
      getActiveTab().then(function (tab) {
        if (!tab) { showStatus('No active tab', 'red'); return; }
        var selected = getSelectedQuestionsWithAnswers();
        if (!selected.length) { showStatus('No answers to apply', 'red'); return; }
        showStatus('Applying answers to page...', '#409EFF');
        chrome.tabs.sendMessage(tab.id, { action: 'APPLY_ANSWERS_BATCH', data: selected }, function (resp) {
          if (resp && resp.results) {
            var successCount = resp.results.filter(function (r) { return r.success; }).length;
            showStatus('Applied ' + successCount + '/' + resp.results.length, 'green');
          } else {
            showStatus(resp && resp.error ? resp.error : 'Apply failed', 'red');
          }
        });
      });
    });
  }
});

var lastQuestions = [];

function getActiveTab() {
  return new Promise(function (resolve) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      resolve(tabs && tabs[0]);
    });
  });
}

function renderQuestions(qs) {
  lastQuestions = qs || [];
  var area = document.getElementById('questionArea');
  area.innerHTML = '';
  if (!qs || !qs.length) { area.style.display = 'none'; return; }
  area.style.display = 'block';

  qs.forEach(function (q) {
    var container = document.createElement('div');
    container.id = 'qa-' + q.id;
    container.style.padding = '6px';
    container.style.borderBottom = '1px solid #f0f0f0';
    container.innerHTML =
      '<div style="display:flex; align-items:center; gap:8px;">' +
      '<input type="checkbox" data-id="' + q.id + '">' +
      '<div style="flex:1">' +
      '<div style="font-size:12px; color:#333;">' + escapeHtml(q.question).slice(0, 120) + '</div>' +
      '<div style="font-size:11px; color:#909399; margin-top:4px;">Type: ' + q.type + (q.applySupported ? ' \u00b7 AutoApply' : '') + '</div>' +
      '</div>' +
      '<div style="display:flex; gap:6px; align-items:center;">' +
      '<button class="qa-highlight" data-id="' + q.id + '" title="Highlight" style="background:#fff;border:1px solid #e6e6e6;border-radius:4px;padding:4px 6px;color:#409EFF;cursor:pointer;">Highlight</button>' +
      '</div>' +
      '</div>' +
      '<div style="margin-top:6px; font-size:12px; color:#409EFF;">AI: <span class="qa-answer">-</span></div>';
    area.appendChild(container);
  });

  Array.from(area.querySelectorAll('.qa-highlight')).forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-id');
      getActiveTab().then(function (tab) {
        if (!tab) { showStatus('No active tab', 'red'); return; }
        chrome.tabs.sendMessage(tab.id, { action: 'HIGHLIGHT_QUESTION', id: id }, function (resp) {
          if (resp && resp.success) showStatus('Highlighted', 'green');
          else showStatus(resp && resp.error ? resp.error : 'Highlight failed', 'red');
        });
      });
    });
  });
}

function getSelectedQuestions() {
  var checks = Array.from(document.querySelectorAll('#questionArea input[type="checkbox"]:checked'));
  return checks.map(function (cb) {
    var id = cb.getAttribute('data-id');
    var q = lastQuestions.find(function (x) { return x.id === id; });
    return { id: q.id, index: q.index, question: q.question, type: q.type, options: q.options };
  });
}

function getSelectedQuestionsWithAnswers() {
  var checks = Array.from(document.querySelectorAll('#questionArea input[type="checkbox"]:checked'));
  return checks.map(function (cb) {
    var id = cb.getAttribute('data-id');
    var q = lastQuestions.find(function (x) { return x.id === id; });
    var el = document.querySelector('#qa-' + id);
    var answer = el ? el.querySelector('.qa-answer').textContent.trim() : '';
    return { id: q.id, index: q.index, answer: answer };
  }).filter(function (x) { return x.answer && x.answer !== '-'; });
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

function showStatus(text, color) {
  color = color || 'black';
  var el = document.getElementById('status');
  el.textContent = text;
  el.style.color = color;
}

function showTestResult(text, color) {
  color = color || 'black';
  var el = document.getElementById('testResult');
  el.textContent = text;
  el.style.display = 'block';
  el.style.backgroundColor = color === 'green' ? '#f0f9ff' : (color === 'red' ? '#fef0f0' : '#fdf6ec');
  el.style.border = '1px solid ' + color;
  el.style.color = color === 'green' ? '#67C23A' : (color === 'red' ? '#F56C6C' : '#E6A23C');
  el.style.whiteSpace = 'pre-wrap';
}
