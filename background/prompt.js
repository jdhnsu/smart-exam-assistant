var EA = typeof EA !== 'undefined' ? EA : {};

EA.Prompt = {
  create(data, customPrompt) {
    if (data.type === 'short-answer' || data.type === 'comprehension') {
      var basePrompt = 'You are a helpful exam assistant. Please answer the following question directly and concisely.';
      if (customPrompt) {
        basePrompt = 'You are a helpful exam assistant. ' + customPrompt;
      }
      var passagePart = data.passageText ? 'Passage:\n' + data.passageText + '\n\n' : '';
      return basePrompt + '\n\n' + passagePart + 'Question: ' + data.question + '\n\nPlease provide a direct answer without additional explanation.';
    }

    var optionsStr = data.options.map(function (o) { return o.letter + '. ' + o.text; }).join('\n');
    var typeHint = data.type === 'checkbox' ? '(Select ALL that apply)' : '(Select only ONE)';
    var passagePart2 = data.passageText ? 'Passage:\n' + data.passageText + '\n\n' : '';

    return 'You are a helpful exam assistant.\n  ' + passagePart2 + 'Question: ' + data.question + ' ' + typeHint + '\n  Options:\n  ' + optionsStr + '\n\n  Please provide ONLY the letters corresponding to the correct answer(s).\n  If multiple answers are correct, combine them (e.g., "AC" or "ABD").\n  Do not add any explanation or punctuation.';
  }
};
