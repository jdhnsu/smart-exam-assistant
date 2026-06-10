var EA = typeof EA !== 'undefined' ? EA : {};

EA.AnswerCleaner = {
  clean(answer, type) {
    if (!answer) return null;
    if (type === 'short-answer') {
      return answer.trim();
    }
    return answer.trim().toUpperCase().replace(/[^A-Z]/g, '');
  }
};
