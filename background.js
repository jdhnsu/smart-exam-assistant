chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_AI_ANSWER") {
    handleAIRequest(request.data, sendResponse);
    return true; // Keep message channel open for async response
  }
});

async function handleAIRequest(questionData, sendResponse) {
  try {
    const settings = await chrome.storage.sync.get(['provider', 'apiKey', 'modelName']);
    
    if (!settings.apiKey) {
      sendResponse({ error: "API Key missing" });
      return;
    }

    const prompt = createPrompt(questionData);
    let answer = null;

    if (settings.provider === 'openai') {
      answer = await callOpenAI(settings.apiKey, settings.modelName || 'gpt-3.5-turbo', prompt);
    } else if (settings.provider === 'gemini') {
      answer = await callGemini(settings.apiKey, settings.modelName || 'gemini-1.5-flash', prompt);
    } else if (settings.provider === 'qwen') {
      answer = await callQwen(settings.apiKey, settings.modelName || 'qwen-plus', prompt);
    }

    // Clean up answer (expecting "A", "B" or "A,C", "ABC")
    // Allow multiple letters for checkboxes
    const cleanAnswer = answer ? answer.trim().toUpperCase().replace(/[^A-Z]/g, '') : null;
    
    sendResponse({ answer: cleanAnswer });

  } catch (error) {
    console.error("AI Request Failed:", error);
    sendResponse({ error: error.message });
  }
}

function createPrompt(data) {
  let optionsStr = data.options.map(o => `${o.letter}. ${o.text}`).join('\n');
  const typeHint = data.type === 'checkbox' ? '(Select ALL that apply)' : '(Select only ONE)';
  
  return `You are a helpful exam assistant. 
  Question: ${data.question} ${typeHint}
  Options:
  ${optionsStr}
  
  Please provide ONLY the letters corresponding to the correct answer(s). 
  If multiple answers are correct, combine them (e.g., "AC" or "ABD"). 
  Do not add any explanation or punctuation.`;
}

async function callOpenAI(apiKey, model, prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    })
  });
  
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

async function callGemini(apiKey, model, prompt) {
  // Simple implementation for Gemini API
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates[0].content.parts[0].text;
}

async function callQwen(apiKey, model, prompt) {
  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }]
    })
  });
  
  const data = await response.json();
  if (data.error) throw new Error(data.message || data.code);
  // Qwen compatible API returns standard OpenAI format
  return data.choices[0].message.content;
}
