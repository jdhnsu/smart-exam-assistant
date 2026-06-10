var EA = typeof EA !== 'undefined' ? EA : {};

EA.Prompt = {
  create(data, customPrompt, options) {
    var isBoxSelect = options && options.source === 'box-select';
    
    if (data.type === 'short-answer' || data.type === 'comprehension') {
      var basePrompt = 'You are a helpful exam assistant.';
      
      if (isBoxSelect) {
        // ALT+Q 模式：简答题，自由回答，使用中文
        if (customPrompt) {
          basePrompt = 'You are a helpful exam assistant. ' + customPrompt;
        } else {
          basePrompt += ' Please answer the following question directly and concisely with a brief explanation in Chinese (简体中文).';
        }
        var passagePart = data.passageText ? 'Passage:\n' + data.passageText + '\n\n' : '';
        return basePrompt + '\n\n' + passagePart + 'Question: ' + data.question + 
               '\n\nProvide your answer with a short explanation (1-2 sentences) in Chinese.';
      } else {
        // 原有逻辑
        if (customPrompt) {
          basePrompt = 'You are a helpful exam assistant. ' + customPrompt;
        } else {
          basePrompt += ' Please answer the following question directly and concisely.';
        }
        var passagePart = data.passageText ? 'Passage:\n' + data.passageText + '\n\n' : '';
        return basePrompt + '\n\n' + passagePart + 'Question: ' + data.question + 
               '\n\nPlease provide a direct answer without additional explanation.';
      }
    }

    // 选择题处理
    var optionsStr = data.options.map(function (o) { return o.letter + '. ' + o.text; }).join('\n');
    var typeHint = data.type === 'checkbox' ? '(Select ALL that apply)' : '(Select only ONE)';
    var passagePart2 = data.passageText ? 'Passage:\n' + data.passageText + '\n\n' : '';

    if (isBoxSelect) {
      // ALT+Q 模式：选择题，指出正确答案并解释，使用中文
      var prompt = 'You are a helpful exam assistant. Please analyze this question and provide the correct answer with a brief explanation in Chinese (简体中文).\n\n' + 
                   passagePart2 + 
                   'Question: ' + data.question + ' ' + typeHint + '\n' +
                   'Options:\n' + optionsStr + '\n\n' +
                   'Please indicate which option(s) is correct and explain why in 1-2 sentences in Chinese.';
      
      if (customPrompt) {
        prompt = 'You are a helpful exam assistant. ' + customPrompt + '\n\n' + 
                 passagePart2 + 'Question: ' + data.question + ' ' + typeHint + '\n' +
                 'Options:\n' + optionsStr +
                 '\n\nPlease provide the correct answer with a brief explanation in Chinese.';
      }
      
      return prompt;
    } else {
      // 原有逻辑
      var prompt = 'You are a helpful exam assistant.\n  ' + passagePart2 + 
                   'Question: ' + data.question + ' ' + typeHint + '\n  Options:\n  ' + optionsStr + 
                   '\n\n  Please provide ONLY the letters corresponding to the correct answer(s).\n  ' +
                   'If multiple answers are correct, combine them (e.g., "AC" or "ABD").\n  ' +
                   'Do not add any explanation or punctuation.';
      
      if (customPrompt) {
        prompt = 'You are a helpful exam assistant. ' + customPrompt + '\n\n' + 
                 passagePart2 + 'Question: ' + data.question + ' ' + typeHint + '\n  Options:\n  ' + optionsStr +
                 '\n\nPlease provide ONLY the letters corresponding to the correct answer(s).';
      }
      
      return prompt;
    }
  }
};