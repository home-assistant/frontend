import { HassEntity } from "home-assistant-js-websocket";

export default function computeRTL(stateObj: HassEntity) {
  var lang = stateObj.selectedLanguage || stateObj.language;
  if (stateObj.translationMetadata.translations[lang]) {
    return stateObj.translationMetadata.translations[lang].isRTL || false;
  }
  return false;
}
