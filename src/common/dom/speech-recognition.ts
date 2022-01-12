export const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
export const SpeechGrammarList =
  window.SpeechGrammarList || window.webkitSpeechGrammarList;
export const SpeechRecognitionEvent =
  // @ts-expect-error
  window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;
