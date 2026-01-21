chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_AI_ANSWER") {
    handleAIRequest(request.data, sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === 'GET_AI_ANSWERS_BATCH') {
    handleAIRequestBatch(request.data, sendResponse);
    return true;
  }
});

async function handleAIRequest(questionData, sendResponse) {
  try {
    const settings = await chrome.storage.sync.get(['provider', 'apiKey', 'modelName', 'shortAnswerPrompt']);

    if (!settings.apiKey) {
      sendResponse({ error: "API Key missing" });
      return;
    }

    const prompt = createPrompt(questionData, settings.shortAnswerPrompt || '');
    let answer = null;

    if (settings.provider === 'openai') {
      answer = await callOpenAI(settings.apiKey, settings.modelName || 'gpt-3.5-turbo', prompt);
    } else if (settings.provider === 'gemini') {
      answer = await callGemini(settings.apiKey, settings.modelName || 'gemini-1.5-flash', prompt);
    } else if (settings.provider === 'qwen') {
      answer = await callQwen(settings.apiKey, settings.modelName || 'qwen-plus', prompt);
    }

    // Clean up answer
    let cleanAnswer;
    if (questionData.type === 'short-answer') {
      // For short answer, return the full response (but trim whitespace)
      cleanAnswer = answer ? answer.trim() : null;
    } else {
      // For multiple choice, extract only letters (expecting "A", "B" or "A,C", "ABC")
      cleanAnswer = answer ? answer.trim().toUpperCase().replace(/[^A-Z]/g, '') : null;
    }

    sendResponse({ answer: cleanAnswer });

  } catch (error) {
    console.error("AI Request Failed:", error);
    sendResponse({ error: error.message });
  }
}

async function handleAIRequestBatch(questions, sendResponse) {
  try {
    const settings = await chrome.storage.sync.get(['provider', 'apiKey', 'modelName', 'shortAnswerPrompt']);

    if (!settings.apiKey) {
      sendResponse({ error: 'API Key missing' });
      return;
    }

    const provider = settings.provider;
    const apiKey = settings.apiKey;
    const modelName = settings.modelName || '';
    const shortPrompt = settings.shortAnswerPrompt || '';

    // Simple in-local cache using chrome.storage.local
    const cache = await new Promise(r => chrome.storage.local.get(['ai_cache'], res => r(res.ai_cache || {})));

    const results = [];

    // Process in small batches to avoid bursting API
    const CONCURRENCY = 3;
    for (let i = 0; i < questions.length; i += CONCURRENCY) {
      const batch = questions.slice(i, i + CONCURRENCY);

      const batchPromises = batch.map(async (q) => {
        try {
          const prompt = createPrompt(q, shortPrompt);
          const key = 'k_' + hashString(prompt);

          // Return cached if exists
          if (cache && cache[key]) {
            return { id: q.id, answer: cache[key] };
          }

          let answer = null;
          if (provider === 'openai') {
            answer = await callOpenAI(apiKey, modelName || 'gpt-3.5-turbo', prompt);
          } else if (provider === 'gemini') {
            answer = await callGemini(apiKey, modelName || 'gemini-1.5-flash', prompt);
          } else if (provider === 'qwen') {
            answer = await callQwen(apiKey, modelName || 'qwen-plus', prompt);
          }

          let cleanAnswer = null;
          if (q.type === 'short-answer') {
            cleanAnswer = answer ? answer.trim() : null;
          } else {
            cleanAnswer = answer ? answer.trim().toUpperCase().replace(/[^A-Z]/g, '') : null;
          }

          // Save to cache
          try {
            cache[key] = cleanAnswer;
            chrome.storage.local.set({ ai_cache: cache });
          } catch (e) {
            console.warn('Cache set failed', e);
          }

          return { id: q.id, answer: cleanAnswer };
        } catch (err) {
          return { id: q.id, error: err.message || String(err) };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      // small delay between batches
      await new Promise(r => setTimeout(r, 250));
    }

    sendResponse({ results });
  } catch (error) {
    console.error('Batch AI Request Failed:', error);
    sendResponse({ error: error.message });
  }
}

function hashString(str) {
  // djb2
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i);
    h = h & 0xffffffff;
  }
  return (h >>> 0).toString(16);
}

function createPrompt(data, customPrompt) {
  // Handle short answer questions
  if (data.type === 'short-answer' || data.type === 'comprehension') {
    let basePrompt = `You are a helpful exam assistant. Please answer the following question directly and concisely.`;

    // If user provided a custom prompt, use it
    if (customPrompt) {
      basePrompt = `You are a helpful exam assistant. ${customPrompt}`;
    }

    const passagePart = data.passageText ? `Passage:\n${data.passageText}\n\n` : '';

    return `${basePrompt}\n\n${passagePart}Question: ${data.question}\n\nPlease provide a direct answer without additional explanation.`;
  }

  // Handle multiple choice questions
  let optionsStr = data.options.map(o => `${o.letter}. ${o.text}`).join('\n');
  const typeHint = data.type === 'checkbox' ? '(Select ALL that apply)' : '(Select only ONE)';
  const passagePart = data.passageText ? `Passage:\n${data.passageText}\n\n` : '';

  return `You are a helpful exam assistant.\n  ${passagePart}Question: ${data.question} ${typeHint}\n  Options:\n  ${optionsStr}\n\n  Please provide ONLY the letters corresponding to the correct answer(s).\n  If multiple answers are correct, combine them (e.g., "AC" or "ABD").\n  Do not add any explanation or punctuation.`;
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
