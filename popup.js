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

  // Start Automation
  document.getElementById('startBtn').addEventListener('click', async () => {
    showStatus('Starting...', '#409EFF');
    try {
      const tab = await getActiveTab();
      if (!tab) {
        showStatus('No active tab found', 'red');
        return;
      }
      
      // Try sending message
      sendMessageToTab(tab.id, { action: "START_ANSWERING" });

    } catch (err) {
      showStatus('Error: ' + err.message, 'red');
    }
  });

  // Stop Automation
  document.getElementById('stopBtn').addEventListener('click', async () => {
    try {
      const tab = await getActiveTab();
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { action: "STOP_ANSWERING" });
        showStatus('Stopped', '#F56C6C');
      }
    } catch (err) {
      console.error(err);
    }
  });
});

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function showStatus(text, color = 'black') {
  const el = document.getElementById('status');
  el.textContent = text;
  el.style.color = color;
}

function sendMessageToTab(tabId, message) {
  chrome.tabs.sendMessage(tabId, message, (response) => {
    // Check if connection failed
    if (chrome.runtime.lastError) {
      console.log("Injection missing, injecting now...", chrome.runtime.lastError.message);
      showStatus('Injecting script...', 'orange');
      
      // Inject content script manually
      chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: true },
        files: ['content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          showStatus('Injection Failed: ' + chrome.runtime.lastError.message, 'red');
        } else {
          // Retry sending message after injection
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, message);
            showStatus('Script Injected & Started!', 'green');
          }, 500);
        }
      });
    } else {
      showStatus('Command Sent!', 'green');
    }
  });
}
