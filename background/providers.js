var EA = typeof EA !== 'undefined' ? EA : {};

EA.Providers = {
  registry: {},

  register(name, callFn) {
    this.registry[name] = callFn;
  },

  get(name) {
    return this.registry[name] || null;
  }
};

EA.Providers.register('openai', function (apiKey, model, prompt, apiUrl) {
  var url = apiUrl || 'https://api.openai.com/v1/chat/completions';
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0
    })
  }).then(function (response) {
    if (!response.ok) {
      return response.text().then(function (text) {
        throw new Error('HTTP ' + response.status + ': ' + text);
      });
    }
    return response.json();
  }).then(function (data) {
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
  });
});

EA.Providers.register('gemini', function (apiKey, model, prompt, apiUrl) {
  var baseUrl = apiUrl || 'https://generativelanguage.googleapis.com/v1beta/models/';
  var url = baseUrl + model + ':generateContent?key=' + apiKey;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  }).then(function (response) {
    if (!response.ok) {
      return response.text().then(function (text) {
        throw new Error('HTTP ' + response.status + ': ' + text);
      });
    }
    return response.json();
  }).then(function (data) {
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text;
  });
});

EA.Providers.register('qwen', function (apiKey, model, prompt, apiUrl) {
  var url = apiUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }]
    })
  }).then(function (response) {
    if (!response.ok) {
      return response.text().then(function (text) {
        throw new Error('HTTP ' + response.status + ': ' + text);
      });
    }
    return response.json();
  }).then(function (data) {
    if (data.error) throw new Error(data.message || data.code);
    return data.choices[0].message.content;
  });
});

EA.Providers.register('deepseek', function (apiKey, model, prompt, apiUrl) {
  var url = apiUrl || 'https://api.deepseek.com/v1/chat/completions';
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0
    })
  }).then(function (response) {
    if (!response.ok) {
      return response.text().then(function (text) {
        throw new Error('HTTP ' + response.status + ': ' + text);
      });
    }
    return response.json();
  }).then(function (data) {
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
  });
});

EA.Providers.register('glm', function (apiKey, model, prompt, apiUrl) {
  var url = apiUrl || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0
    })
  }).then(function (response) {
    if (!response.ok) {
      return response.text().then(function (text) {
        throw new Error('HTTP ' + response.status + ': ' + text);
      });
    }
    return response.json();
  }).then(function (data) {
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
  });
});
