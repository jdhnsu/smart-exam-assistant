var EA = typeof EA !== 'undefined' ? EA : {};

EA.Actions = {
  GET_AI_ANSWER: 'GET_AI_ANSWER',
  GET_AI_ANSWERS_BATCH: 'GET_AI_ANSWERS_BATCH',
  GET_ALL_QUESTIONS: 'GET_ALL_QUESTIONS',
  START_AREA_SELECT: 'START_AREA_SELECT',
  APPLY_ANSWERS_BATCH: 'APPLY_ANSWERS_BATCH',
  HIGHLIGHT_QUESTION: 'HIGHLIGHT_QUESTION',
  START_ANSWERING: 'START_ANSWERING',
  STOP_ANSWERING: 'STOP_ANSWERING'
};

EA.StorageKeys = {
  PROVIDER: 'provider',
  API_KEY: 'apiKey',
  API_URL: 'apiUrl',
  MODEL_NAME: 'modelName',
  DEBUG_MODE: 'debugMode',
  SHORT_ANSWER_PROMPT: 'shortAnswerPrompt',
  BOX_SELECT_PROMPT: 'boxSelectPrompt',
  AUTO_MODE: 'autoMode',
  SHOW_FLOATING_WIDGET: 'showFloatingWidget',
  DEBUG_MODAL_POS: 'debugModalPos',
  AI_CACHE: 'ai_cache'
};

EA.Defaults = {
  PROVIDER: 'openai',
  OPENAI_MODEL: 'gpt-3.5-turbo',
  GEMINI_MODEL: 'gemini-1.5-flash',
  QWEN_MODEL: 'qwen-plus',
  DEEPSEEK_MODEL: 'deepseek-chat',
  GLM_MODEL: 'glm-4-flash'
};

EA.Selectors = {
  QUESTION_BOX: '.item-box',
  QUESTION_TEXT: '.qusetion-info .info-item .value',
  TYPE_TAG: '.question-type .el-tag__content',
  RADIO_GROUP: '.el-radio-group',
  CHECKBOX_GROUP: '.el-checkbox-group',
  OPTION_ITEM: '.choices',
  OPTION_INPUT: 'input.el-radio__original, input.el-checkbox__original',
  OPTION_LABEL: '.choices-html',
  OPTION_LETTER: '.choices-label',
  SHORT_ANSWER_INPUT: '.el-input__inner',
  ACTIVE_NUM: '.q-num-box.haveActive',
  CHECKED_RADIO: '.el-radio.is-checked',
  CHECKED_CHECKBOX: '.el-checkbox.is-checked'
};
