document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  chrome.storage.sync.get(['provider', 'apiKey', 'modelName', 'debugMode'], (result) => {
    if (result.provider) document.getElementById('provider').value = result.provider;
    if (result.apiKey) document.getElementById('apiKey').value = result.apiKey;
    if (result.modelName) document.getElementById('modelName').value = result.modelName;
    if (result.debugMode) document.getElementById('debugMode').checked = result.debugMode;
  });

  // Save Settings
  document.getElementById('saveBtn').addEventListener('click', () => {
    const provider = document.getElementById('provider').value;
    const apiKey = document.getElementById('apiKey').value;
    const modelName = document.getElementById('modelName').value;
    const debugMode = document.getElementById('debugMode').checked;

    if (!apiKey) {
      showStatus('Please enter an API Key', 'red');
      return;
    }

    chrome.storage.sync.set({ provider, apiKey, modelName, debugMode }, () => {
      showStatus('Settings Saved!', 'green');
    });
  });
});

function showStatus(text, color = 'black') {
  const el = document.getElementById('status');
  el.textContent = text;
  el.style.color = color;
}
