var EA = typeof EA !== 'undefined' ? EA : {};

EA.Applicator = {
  selectOption(data, answer) {
    var letters = answer.split('');
    var successCount = 0;

    if (data.optionInputMap && data.optionInputMap.size > 0) {
      letters.forEach(function (letter) {
        var input = data.optionInputMap.get(letter);
        if (input) {
          var clickableLabel = input.closest('.el-radio, .el-checkbox');
          if (clickableLabel) {
            var isChecked = clickableLabel.classList.contains('is-checked');
            if (!isChecked) {
              clickableLabel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
              clickableLabel.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
              clickableLabel.click();
              input.click();
              successCount++;
            } else {
              successCount++;
            }
          }
        }
      });
    } else {
      console.warn('[EA] optionInputMap not available, using fallback method');
      var questionEl = EA.Extractor.findCurrentQuestion();
      if (!questionEl) return false;
      var inputs = Array.from(questionEl.querySelectorAll(EA.Selectors.OPTION_INPUT));
      letters.forEach(function (letter) {
        var targetInput = inputs.find(function (i) { return i.value === letter; });
        if (targetInput) {
          var clickableLabel = targetInput.closest('.el-radio, .el-checkbox');
          var isChecked = clickableLabel && clickableLabel.classList.contains('is-checked');
          if (clickableLabel && !isChecked) {
            clickableLabel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            clickableLabel.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            clickableLabel.click();
            successCount++;
          } else if (isChecked) {
            successCount++;
          }
        }
      });
    }

    return successCount > 0;
  },

  fillAnswer(inputElement, answer) {
    if (!inputElement) return false;
    try {
      inputElement.focus();
      inputElement.value = answer;
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      if (inputElement.__v_model) {
        inputElement.__v_model.value = answer;
      }
      return true;
    } catch (e) {
      console.error('[EA] Failed to fill answer:', e);
      return false;
    }
  },

  highlightQuestionById(id) {
    try {
      var el = document.querySelector('[data-_ea_id="' + id + '"]');
      var target = el;
      if (!target) {
        var qs = Array.from(document.querySelectorAll(EA.Selectors.QUESTION_BOX));
        var q = qs.find(function (node) {
          return (node.innerText || '').includes(id.replace('q-split-', '').slice(0, 10));
        });
        target = q || null;
      }

      if (!target) return { success: false, error: 'element not found' };

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('ea-temp-highlight');

      if (!document.getElementById('ea-highlight-style')) {
        var s = document.createElement('style');
        s.id = 'ea-highlight-style';
        s.innerHTML = '.ea-temp-highlight{transition:box-shadow .2s ease,background-color .2s ease;box-shadow:0 0 0 3px rgba(64,158,255,0.25) inset,0 6px 18px rgba(64,158,255,0.12);background-color:rgba(64,158,255,0.04);border-radius:6px;}';
        document.head.appendChild(s);
      }

      setTimeout(function () {
        try { target.classList.remove('ea-temp-highlight'); } catch (e) { /* ignore */ }
      }, 3500);

      return { success: true };
    } catch (err) {
      return { success: false, error: err && err.message };
    }
  },

  applyBatchAnswers(answers) {
    var containers = Array.from(document.querySelectorAll(EA.Selectors.QUESTION_BOX));
    var self = this;

    return answers.map(function (item) {
      try {
        if (!item.id || !item.id.startsWith('q-')) {
          return { id: item.id, success: false, error: 'apply not supported for this id' };
        }
        var idx = parseInt(item.id.replace('q-', ''), 10);
        var container = containers[idx];
        if (!container) return { id: item.id, success: false, error: 'container not found' };

        var qdata = EA.Extractor.extractQuestionData(container);
        if (!qdata) return { id: item.id, success: false, error: 'could not extract question' };

        var ok = false;
        if (qdata.type === 'short-answer' && qdata.inputElement) {
          ok = self.fillAnswer(qdata.inputElement, item.answer || '');
        } else if (qdata.options && qdata.options.length) {
          ok = self.selectOption(qdata, (item.answer || '').toString());
        } else {
          return { id: item.id, success: false, error: 'no fillable element' };
        }

        return { id: item.id, success: !!ok };
      } catch (err) {
        return { id: item.id, success: false, error: err && err.message };
      }
    });
  }
};
