document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  chrome.storage.sync.get(['provider', 'apiKey', 'modelName', 'debugMode', 'shortAnswerPrompt'], (result) => {
    if (result.provider) document.getElementById('provider').value = result.provider;
    if (result.apiKey) document.getElementById('apiKey').value = result.apiKey;
    if (result.modelName) document.getElementById('modelName').value = result.modelName;
    if (result.debugMode) document.getElementById('debugMode').checked = result.debugMode;
    if (result.shortAnswerPrompt) document.getElementById('shortAnswerPrompt').value = result.shortAnswerPrompt;
  });

  // Save Settings
  document.getElementById('saveBtn').addEventListener('click', () => {
    const provider = document.getElementById('provider').value;
    const apiKey = document.getElementById('apiKey').value;
    const modelName = document.getElementById('modelName').value;
    const debugMode = document.getElementById('debugMode').checked;
    const shortAnswerPrompt = document.getElementById('shortAnswerPrompt').value.trim();

    if (!apiKey) {
      showStatus('Please enter an API Key', 'red');
      return;
    }

    chrome.storage.sync.set({ provider, apiKey, modelName, debugMode, shortAnswerPrompt }, () => {
      showStatus('Settings Saved!', 'green');
    });
  });

  // Fetch questions button
  const fetchBtn = document.getElementById('fetchQuestions');
  if (fetchBtn) {
    fetchBtn.addEventListener('click', async () => {
      showStatus('Requesting questions from page...', '#409EFF');
      const tab = await getActiveTab();
      if (!tab) { showStatus('No active tab', 'red'); return; }
      chrome.tabs.sendMessage(tab.id, { action: 'GET_ALL_QUESTIONS' }, (resp) => {
        if (chrome.runtime.lastError) {
          showStatus('Content script not available on this page', 'red');
          return;
        }
        const qs = resp && resp.questions ? resp.questions : [];
        renderQuestions(qs);
        showStatus(`Found ${qs.length} questions`, 'black');
      });
    });
  }

  // Start area select on page
  const selectBtn = document.getElementById('selectOnPage');
  if (selectBtn) {
    selectBtn.addEventListener('click', async () => {
      showStatus('Activate selection on page...', '#409EFF');
      const tab = await getActiveTab();
      if (!tab) { showStatus('No active tab', 'red'); return; }
      chrome.tabs.sendMessage(tab.id, { action: 'START_AREA_SELECT' }, (resp) => {
        if (chrome.runtime.lastError) {
          showStatus('Content script not available on this page', 'red');
          return;
        }
        if (resp && resp.cancelled) { showStatus('Selection cancelled', 'black'); return; }
        const qs = resp && resp.questions ? resp.questions : [];
        renderQuestions(qs);
        showStatus(`Selection returned ${qs.length} questions`, 'black');
      });
    });
  }

  // Batch AI request
  const aiBtn = document.getElementById('batchAI');
  if (aiBtn) {
    aiBtn.addEventListener('click', async () => {
      const selected = getSelectedQuestions();
      if (!selected.length) { showStatus('No questions selected', 'red'); return; }
      showStatus('Requesting AI answers...', '#E6A23C');
      chrome.runtime.sendMessage({ action: 'GET_AI_ANSWERS_BATCH', data: selected }, (resp) => {
        if (resp && resp.results) {
          // Map results to UI
          resp.results.forEach(r => {
            const el = document.querySelector(`#qa-${r.id}`);
            if (el) el.querySelector('.qa-answer').textContent = r.answer || (r.error ? `Error: ${r.error}` : '');
          });
          showStatus('AI answers returned', 'green');
        } else {
          showStatus(resp && resp.error ? resp.error : 'Batch AI error', 'red');
        }
      });
    });
  }

  // Apply selected answers
  const applyBtn = document.getElementById('applySelected');
  if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
      const tab = await getActiveTab();
      if (!tab) { showStatus('No active tab', 'red'); return; }
      const selected = getSelectedQuestionsWithAnswers();
      if (!selected.length) { showStatus('No answers to apply', 'red'); return; }
      showStatus('Applying answers to page...', '#409EFF');
      chrome.tabs.sendMessage(tab.id, { action: 'APPLY_ANSWERS_BATCH', data: selected }, (resp) => {
        if (resp && resp.results) {
          const successCount = resp.results.filter(r => r.success).length;
          showStatus(`Applied ${successCount}/${resp.results.length}`, 'green');
        } else {
          showStatus(resp && resp.error ? resp.error : 'Apply failed', 'red');
        }
      });
    });
  }
});

let lastQuestions = [];

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs[0]);
    });
  });
}

function renderQuestions(qs) {
  lastQuestions = qs || [];
  const area = document.getElementById('questionArea');
  area.innerHTML = '';
  if (!qs || !qs.length) { area.style.display = 'none'; return; }
  area.style.display = 'block';

  qs.forEach(q => {
    const container = document.createElement('div');
    container.id = `qa-${q.id}`;
    container.style.padding = '6px';
    container.style.borderBottom = '1px solid #f0f0f0';
    container.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <input type="checkbox" data-id="${q.id}">
        <div style="flex:1">
          <div style="font-size:12px; color:#333;">${escapeHtml(q.question).slice(0,120)}</div>
          <div style="font-size:11px; color:#909399; margin-top:4px;">Type: ${q.type} ${q.applySupported? ' · AutoApply' : ''}</div>
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
          <button class="qa-highlight" data-id="${q.id}" title="Highlight" style="background:#fff;border:1px solid #e6e6e6;border-radius:4px;padding:4px 6px;color:#409EFF;cursor:pointer;">Highlight</button>
        </div>
      </div>
      <div style="margin-top:6px; font-size:12px; color:#409EFF;">AI: <span class="qa-answer">-</span></div>
    `;
    area.appendChild(container);
  });

  // attach highlight handlers
  Array.from(area.querySelectorAll('.qa-highlight')).forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.getAttribute('data-id');
      const tab = await getActiveTab();
      if (!tab) { showStatus('No active tab', 'red'); return; }
      chrome.tabs.sendMessage(tab.id, { action: 'HIGHLIGHT_QUESTION', id }, (resp) => {
        if (resp && resp.success) showStatus('Highlighted', 'green');
        else showStatus(resp && resp.error ? resp.error : 'Highlight failed', 'red');
      });
    });
  });
}

function getSelectedQuestions() {
  const checks = Array.from(document.querySelectorAll('#questionArea input[type="checkbox"]:checked'));
  return checks.map(cb => {
    const id = cb.getAttribute('data-id');
    const q = lastQuestions.find(x => x.id === id);
    // send minimal fields to background
    return { id: q.id, index: q.index, question: q.question, type: q.type, options: q.options };
  });
}

function getSelectedQuestionsWithAnswers() {
  const checks = Array.from(document.querySelectorAll('#questionArea input[type="checkbox"]:checked'));
  return checks.map(cb => {
    const id = cb.getAttribute('data-id');
    const q = lastQuestions.find(x => x.id === id);
    const el = document.querySelector(`#qa-${id}`);
    const answer = el ? el.querySelector('.qa-answer').textContent.trim() : '';
    return { id: q.id, index: q.index, answer };
  }).filter(x => x.answer && x.answer !== '-');
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>\"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

function showStatus(text, color = 'black') {
  const el = document.getElementById('status');
  el.textContent = text;
  el.style.color = color;
}
