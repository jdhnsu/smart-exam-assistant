var EA = typeof EA !== 'undefined' ? EA : {};

EA.Extractor = {
  findCurrentQuestion() {
    var questions = Array.from(document.querySelectorAll(EA.Selectors.QUESTION_BOX));
    return questions.find(function (q) {
      var style = window.getComputedStyle(q);
      return style.display !== 'none' && style.visibility !== 'hidden' && q.offsetParent !== null;
    }) || null;
  },

  isQuestionAnswered(questionEl) {
    return !!questionEl.querySelector(EA.Selectors.CHECKED_RADIO + ', ' + EA.Selectors.CHECKED_CHECKBOX);
  },

  getQuestionType(questionEl) {
    var typeTag = questionEl.querySelector(EA.Selectors.TYPE_TAG);
    var typeText = typeTag ? typeTag.innerText.trim() : '';
    return { typeText: typeText, isShortAnswer: EA.Utils.isShortAnswerType(typeText) };
  },

  extractQuestionData(questionEl) {
    try {
      var textEl = questionEl.querySelector(EA.Selectors.QUESTION_TEXT);
      var questionText = textEl ? textEl.innerText.replace(/\s+/g, ' ').trim() : 'Unknown Question';
      var typeInfo = this.getQuestionType(questionEl);

      if (typeInfo.isShortAnswer) {
        var inputEl = questionEl.querySelector(EA.Selectors.SHORT_ANSWER_INPUT);
        return { question: questionText, options: [], type: 'short-answer', inputElement: inputEl };
      }

      var isCheckbox = !!questionEl.querySelector(EA.Selectors.CHECKBOX_GROUP);
      var options = [];
      var optionInputMap = new Map();
      var optionEls = questionEl.querySelectorAll(
        EA.Selectors.RADIO_GROUP + ' ' + EA.Selectors.OPTION_ITEM + ', ' +
        EA.Selectors.CHECKBOX_GROUP + ' ' + EA.Selectors.OPTION_ITEM
      );

      optionEls.forEach(function (opt) {
        var input = opt.querySelector(EA.Selectors.OPTION_INPUT);
        var labelText = opt.querySelector(EA.Selectors.OPTION_LABEL);
        var letterDiv = opt.querySelector(EA.Selectors.OPTION_LETTER);
        var letter = letterDiv ? letterDiv.innerText.replace('.', '').trim() : '';
        var text = labelText ? labelText.innerText.trim() : '';
        if (letter && text && input) {
          options.push({ letter: letter, text: text });
          optionInputMap.set(letter, input);
        }
      });

      return {
        question: questionText,
        options: options,
        type: isCheckbox ? 'checkbox' : 'radio',
        optionInputMap: optionInputMap
      };
    } catch (e) {
      console.error('[EA] Extraction error', e);
      return null;
    }
  },

  extractAllQuestions() {
    try {
      var containers = Array.from(document.querySelectorAll(EA.Selectors.QUESTION_BOX));

      if (containers.length > 1) {
        var passageKeywords = ['阅读下列', '根据短文', '根据短文回答', '阅读短文', '阅读下面短文', '相关阅读'];
        var passageEls = Array.from(document.querySelectorAll('p, div, section')).filter(function (el) {
          var txt = (el.innerText || '').trim();
          if (!txt) return false;
          if (txt.length > 300) return true;
          for (var i = 0; i < passageKeywords.length; i++) {
            if (txt.includes(passageKeywords[i])) return true;
          }
          return false;
        });

        var groups = {};
        var self = this;

        containers.forEach(function (el, idx) {
          var q = self.extractQuestionData(el);
          var passage = passageEls.find(function (p) {
            return p.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING;
          });
          var setId = passage ? 'set-' + passageEls.indexOf(passage) : null;
          var passageText = passage ? (passage.innerText || '').trim().slice(0, 2000) : null;

          if (setId) groups[setId] = passageText;

          var questionText = q ? q.question : (el.innerText || '').slice(0, 400);
          var opts = q ? q.options : [];
          groups[idx] = groups[idx] || null;

          containers[idx].dataset._ea_id = 'q-' + idx;
          containers[idx]._ea_data = {
            id: 'q-' + idx,
            index: idx,
            question: questionText,
            type: q ? q.type : 'unknown',
            options: opts,
            applySupported: true,
            setId: setId,
            passageText: passageText
          };
        });

        return containers.map(function (el) { return el._ea_data; });
      }

      var root = containers[0] || document.body;
      var text = root.innerText || '';

      var passageHeaderMatch = text.match(/(阅读下列[\s\S]{0,40}|根据短文[\s\S]{0,40}|阅读下面短文[\s\S]{0,40})/i);
      var passageText = null;
      if (passageHeaderMatch) {
        var after = text.slice(passageHeaderMatch.index + passageHeaderMatch[0].length).trim();
        passageText = after.slice(0, 1200);
      }

      var parts = text.split(/\n(?=\s*\d+[\.|\)|\uff0e]\s+)/);
      var questions = parts.map(function (part, idx) {
        var lines = part.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        var parsed = EA.Utils.parseOptionsFromLines(lines);
        var opts = parsed.options;
        var stemLines = parsed.stemLines;

        var isComp = !!passageText && idx > 0;

        return {
          id: 'q-split-' + idx,
          index: idx,
          question: stemLines.join(' ').slice(0, 2000),
          type: opts.length ? 'radio' : (isComp ? 'comprehension' : 'short-answer'),
          options: opts,
          applySupported: false,
          setId: passageText ? 'passage-0' : null,
          passageText: passageText
        };
      });

      return questions;
    } catch (e) {
      console.error('[EA] extractAllQuestions failed', e);
      return [];
    }
  },

  getQuestionSignature(questionEl, data) {
    var activeNum = document.querySelector(EA.Selectors.ACTIVE_NUM);
    var activeIndex = activeNum ? activeNum.innerText.trim() : '';
    if (!questionEl) return 'active:' + activeIndex + '|empty';
    var questionData = data || this.extractQuestionData(questionEl);
    var questionText = questionData && questionData.question
      ? questionData.question
      : ((questionEl.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300));
    var type = questionData && questionData.type ? questionData.type : '';
    return 'active:' + activeIndex + '|type:' + type + '|text:' + questionText;
  },

  extractFromSelection(range) {
    try {
      var text = range.toString().trim();
      if (!text) return [];

      var parts = text.split(/\n(?=\s*\d+[\.|\)|\uff0e]\s+)/);
      if (parts.length <= 1) {
        parts = text.split(/\n\s*\n/).filter(Boolean);
      }

      var self = this;
      var questions = parts.map(function (part, idx) {
        var lines = part.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        var parsed = EA.Utils.parseOptionsFromLines(lines);
        var opts = parsed.options;
        var stem = parsed.stemLines;
        if (!opts.length) {
          try {
            var found = self.findOptionsNearRange(range);
            if (found && found.length) {
              found.forEach(function (o) { opts.push(o); });
            }
          } catch (e) {
            console.warn('findOptionsNearRange failed', e);
          }
        }
        return {
          id: 'sel-range-' + idx,
          index: idx,
          question: stem.join(' ').slice(0, 2000),
          type: opts.length ? 'radio' : 'short-answer',
          options: opts,
          applySupported: false
        };
      });
      return questions;
    } catch (e) {
      console.error('[EA] extractFromSelection error', e);
      return [];
    }
  },

  findOptionsNearRange(range) {
    try {
      var maxSteps = 12;
      var res = [];
      var el = range.endContainer.nodeType === 1 ? range.endContainer : range.endContainer.parentElement;
      if (!el) return res;

      var ancestor = el;
      for (var i = 0; i < 6; i++) {
        if (!ancestor) break;
        var inputs = ancestor.querySelectorAll('input[type="radio"], input[type="checkbox"], .choices-html, .choices-label, .el-radio, .el-checkbox');
        if (inputs && inputs.length) {
          var seen = new Set();
          inputs.forEach(function (inp) {
            var parent = inp.closest('.choices, .el-radio, .el-checkbox') || inp.parentElement;
            var label = parent ? (parent.innerText || '').trim() : (inp.value || '').toString();
            var m = label.match(/^([A-Z])[\.\)．:]?\s*(.+)$/);
            if (m) {
              var letter = m[1];
              var text = m[2];
              if (!seen.has(letter)) { res.push({ letter: letter, text: text }); seen.add(letter); }
            } else if (label) {
              var fallbackLetter = String.fromCharCode(65 + res.length);
              if (!seen.has(fallbackLetter)) { res.push({ letter: fallbackLetter, text: label }); seen.add(fallbackLetter); }
            }
          });
          if (res.length) return res;
        }
        ancestor = ancestor.parentElement;
      }

      var node = el;
      var steps = 0;
      while (node && steps < maxSteps) {
        node = node.nextElementSibling;
        if (!node) break;
        var txt = (node.innerText || '').trim();
        if (!txt) { steps++; continue; }
        var lines = txt.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        for (var li = 0; li < lines.length; li++) {
          var m = lines[li].match(/^([A-D])[\.\)．:]\s*(.+)$/i);
          if (m) {
            res.push({ letter: m[1].toUpperCase(), text: m[2] });
          }
        }
        if (res.length) return res;
        steps++;
      }

      var rect = range.getBoundingClientRect();
      var sampleX = rect.left + rect.width / 2;
      for (var dy = 8; dy < 500; dy += 30) {
        var y = rect.bottom + dy;
        try {
          var elems = document.elementsFromPoint(sampleX, y);
          for (var ei = 0; ei < elems.length; ei++) {
            var t = (elems[ei].innerText || '').trim();
            if (!t) continue;
            var tlines = t.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
            for (var tli = 0; tli < tlines.length; tli++) {
              var tm = tlines[tli].match(/^([A-D])[\.\)．:]\s*(.+)$/i);
              if (tm) {
                res.push({ letter: tm[1].toUpperCase(), text: tm[2] });
              }
            }
            if (res.length) return res;
          }
        } catch (e) { /* ignore */ }
      }

      return res;
    } catch (e) {
      console.error('[EA] findOptionsNearRange error', e);
      return [];
    }
  }
};
