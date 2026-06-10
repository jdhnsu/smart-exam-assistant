var EA = typeof EA !== 'undefined' ? EA : {};

EA.Utils = {
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  },

  hashString(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) + h) + str.charCodeAt(i);
      h = h & 0xffffffff;
    }
    return (h >>> 0).toString(16);
  },

  isShortAnswerType(typeText) {
    return typeText.includes('问答题') || typeText.includes('填空题') || typeText.includes('简答题');
  },

  storageGet(keys) {
    return new Promise(function (resolve) {
      chrome.storage.sync.get(keys, resolve);
    });
  },

  storageGetLocal(keys) {
    return new Promise(function (resolve) {
      chrome.storage.local.get(keys, resolve);
    });
  },

  storageSet(items) {
    return new Promise(function (resolve) {
      chrome.storage.sync.set(items, resolve);
    });
  },

  storageSetLocal(items) {
    return new Promise(function (resolve) {
      chrome.storage.local.set(items, resolve);
    });
  },

  fetchSingleAnswer: function (data) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage({
        action: EA.Actions.GET_AI_ANSWER,
        data: data
      }, function (response) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message);
          return;
        }
        // 检查 response.answer 是否存在（包括空字符串）
        if (response && response.answer !== undefined && response.answer !== null) {
          resolve(response.answer);
        } else {
          reject(response ? response.error : 'Unknown error');
        }
      });
    });
  },

  parseOptionsFromLines: function (lines) {
    var optionRegexes = [
      /^([A-Z])[\.\)．:、]\s*(.+)$/,
      /^([A-Z])\s{2,3}(.+)$/,
      /^(?:选项)?\s*([A-Z])[\.\)．:、]?\s*(.+)$/i
    ];
    var options = [];
    var stemLines = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var matched = false;

      for (var ri = 0; ri < optionRegexes.length; ri++) {
        var m = line.match(optionRegexes[ri]);
        if (m) {
          var letter = m[1].toUpperCase();
          var text = m[2];
          if (letter >= 'A' && letter <= 'Z') {
            options.push({ letter: letter, text: text });
            matched = true;
          }
          break;
        }
      }

      if (!matched) {
        stemLines.push(line);
      }
    }

    return { options: options, stemLines: stemLines };
  }
};
