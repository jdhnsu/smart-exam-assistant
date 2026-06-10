var EA = typeof EA !== 'undefined' ? EA : {};

EA.Navigator = {
  goToNextQuestion(statusCb) {
    if (statusCb) statusCb('Clicking Next...', '#909399');

    var spans = Array.from(document.querySelectorAll('span, div, button, a'));
    var nextBtnText = spans.find(function (el) {
      var text = el.innerText.trim();
      return (text === '下一题' || text === '下一页') &&
        el.offsetParent !== null &&
        el.tagName !== 'SCRIPT';
    });

    if (nextBtnText) {
      if (this.clickElementOrParent(nextBtnText)) return true;
    }

    var activeNum = document.querySelector(EA.Selectors.ACTIVE_NUM);
    if (activeNum) {
      var nextNum = activeNum.nextElementSibling;
      if (nextNum && nextNum.classList.contains('q-num-box')) {
        if (statusCb) statusCb('Using sidebar navigation...', '#909399');
        nextNum.click();
        return true;
      }
    }

    if (statusCb) statusCb('Could not find next question button', 'red');
    return false;
  },

  clickElementOrParent(el, depth) {
    depth = depth || 3;
    var current = el;
    for (var i = 0; i < depth; i++) {
      if (current) {
        current.click();
        current.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        current.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        current = current.parentElement;
      } else {
        return false;
      }
    }
    return true;
  },

  waitForQuestionChange(previousSignature, isRunningCb, timeoutMs, intervalMs) {
    timeoutMs = timeoutMs || 5000;
    intervalMs = intervalMs || 150;
    return new Promise(function (resolve) {
      var startTime = Date.now();

      function poll() {
        if (!isRunningCb()) {
          resolve(false);
          return;
        }
        var questionEl = EA.Extractor.findCurrentQuestion();
        var currentSignature = EA.Extractor.getQuestionSignature(questionEl);
        if (questionEl && currentSignature !== previousSignature) {
          resolve(true);
          return;
        }
        if (Date.now() - startTime >= timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(poll, intervalMs);
      }

      poll();
    });
  }
};
