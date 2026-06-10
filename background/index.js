importScripts(
  '../shared/constants.js',
  '../shared/utils.js',
  'providers.js',
  'prompt.js',
  'cache.js',
  'answer-cleaner.js'
);

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === EA.Actions.GET_AI_ANSWER) {
    handleAIRequest(request.data, sendResponse);
    return true;
  } else if (request.action === EA.Actions.GET_AI_ANSWERS_BATCH) {
    handleAIRequestBatch(request.data, sendResponse);
    return true;
  } else if (request.action === 'TEST_CONNECTION') {
    handleTestConnection(request.data, sendResponse);
    return true;
  }
});

async function resolveSettings() {
  var settings = await EA.Utils.storageGet([
    EA.StorageKeys.PROVIDER,
    EA.StorageKeys.API_KEY,
    EA.StorageKeys.API_URL,
    EA.StorageKeys.MODEL_NAME,
    EA.StorageKeys.SHORT_ANSWER_PROMPT,
    EA.StorageKeys.BOX_SELECT_PROMPT
  ]);

  if (!settings[EA.StorageKeys.API_KEY]) {
    throw new Error('API Key missing');
  }

  var provider = settings[EA.StorageKeys.PROVIDER] || EA.Defaults.PROVIDER;
  var apiKey = settings[EA.StorageKeys.API_KEY];
  var apiUrl = settings[EA.StorageKeys.API_URL] || '';
  var modelName = settings[EA.StorageKeys.MODEL_NAME] || '';
  var shortPrompt = settings[EA.StorageKeys.SHORT_ANSWER_PROMPT] || '';
  var boxSelectPrompt = settings[EA.StorageKeys.BOX_SELECT_PROMPT] || '';

  var callFn = EA.Providers.get(provider);
  if (!callFn) {
    throw new Error('Unknown provider: ' + provider);
  }

  var defaultModel = provider === 'openai' ? EA.Defaults.OPENAI_MODEL :
    provider === 'gemini' ? EA.Defaults.GEMINI_MODEL :
      provider === 'qwen' ? EA.Defaults.QWEN_MODEL :
        provider === 'deepseek' ? EA.Defaults.DEEPSEEK_MODEL :
          EA.Defaults.GLM_MODEL;
  var model = modelName || defaultModel;

  return { 
    apiKey: apiKey, 
    apiUrl: apiUrl, 
    model: model, 
    callFn: callFn, 
    shortPrompt: shortPrompt,
    boxSelectPrompt: boxSelectPrompt
  };
}

async function handleAIRequest(questionData, sendResponse) {
  try {
    var resolved = await resolveSettings();

    // 根据来源选择提示词
    var customPrompt = questionData.source === 'box-select' 
      ? resolved.boxSelectPrompt 
      : resolved.shortPrompt;
    
    // 传递 options 参数，包含来源标识
    var prompt = EA.Prompt.create(questionData, customPrompt, { source: questionData.source });
    var answer = await resolved.callFn(resolved.apiKey, resolved.model, prompt, resolved.apiUrl);
    
    // ALT+Q 模式保留原始回答，其他模式使用清理后的答案
    var finalAnswer = questionData.source === 'box-select' 
      ? answer 
      : EA.AnswerCleaner.clean(answer, questionData.type);

    sendResponse({ answer: finalAnswer });
  } catch (error) {
    console.error('[EA] AI Request Failed:', error);
    sendResponse({ error: error.message });
  }
}

async function handleAIRequestBatch(questions, sendResponse) {
  try {
    var resolved = await resolveSettings();

    var cache = await EA.Cache.get();
    var results = [];
    var CONCURRENCY = 3;

    for (var i = 0; i < questions.length; i += CONCURRENCY) {
      var batch = questions.slice(i, i + CONCURRENCY);
      var batchPromises = batch.map(async function (q) {
        try {
          var prompt = EA.Prompt.create(q, resolved.shortPrompt);
          var key = 'k_' + EA.Utils.hashString(prompt);

          if (cache && cache[key]) {
            return { id: q.id, answer: cache[key] };
          }

          var answer = await resolved.callFn(resolved.apiKey, resolved.model, prompt, resolved.apiUrl);
          var cleanAnswer = EA.AnswerCleaner.clean(answer, q.type);

          cache[key] = cleanAnswer;

          return { id: q.id, answer: cleanAnswer };
        } catch (err) {
          return { id: q.id, error: err.message || String(err) };
        }
      });

      var batchResults = await Promise.all(batchPromises);
      results.push.apply(results, batchResults);

      try {
        await EA.Cache.set(cache);
      } catch (e) {
        console.warn('[EA] Cache write failed', e);
      }

      await new Promise(function (r) { setTimeout(r, 250); });
    }

    sendResponse({ results: results });
  } catch (error) {
    console.error('[EA] Batch AI Request Failed:', error);
    sendResponse({ error: error.message });
  }
}

async function handleTestConnection(testData, sendResponse) {
  try {
    var provider = testData.provider;
    var apiKey = testData.apiKey;
    var apiUrl = testData.apiUrl || '';
    var modelName = testData.modelName || '';

    console.log('[EA] Testing connection:', {
      provider: provider,
      apiUrl: apiUrl || '(default)',
      model: modelName || '(default)'
    });

    var callFn = EA.Providers.get(provider);
    if (!callFn) {
      throw new Error('Unknown provider: ' + provider);
    }

    var defaultModel = provider === 'openai' ? EA.Defaults.OPENAI_MODEL :
      provider === 'gemini' ? EA.Defaults.GEMINI_MODEL :
        provider === 'qwen' ? EA.Defaults.QWEN_MODEL :
          provider === 'deepseek' ? EA.Defaults.DEEPSEEK_MODEL :
            EA.Defaults.GLM_MODEL;
    var model = modelName || defaultModel;

    console.log('[EA] Using model:', model);

    var testPrompt = 'hello test';
    var answer = await callFn(apiKey, model, testPrompt, apiUrl);

    console.log('[EA] Test successful, response length:', answer.length);
    sendResponse({ success: true, answer: answer });
  } catch (error) {
    console.error('[EA] Test Connection Failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}
