import { HomeAssistant } from "../../types";

export function computeRTL(hass: HomeAssistant) {
  const lang = hass.language || "en";
  if (hass.translationMetadata.translations[lang]) {
    return hass.translationMetadata.translations[lang].isRTL || false;
  }
  return false;
}

export function computeRTLDirection(hass: HomeAssistant) {
  return emitRTLDirection(computeRTL(hass));
}

export function emitRTLDirection(rtl: boolean) {
  return rtl ? "rtl" : "ltr";
}
