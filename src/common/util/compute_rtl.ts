import type { LitElement } from "lit";
import type { HomeAssistant, Translation } from "../../types";

export function computeRTL(
  language = "en",
  translations: Record<string, Translation>
) {
  if (translations[language]) {
    return translations[language].isRTL || false;
  }
  return false;
}

export function computeRTLDirection(hass: HomeAssistant) {
  return emitRTLDirection(
    computeRTL(hass.language, hass.translationMetadata.translations)
  );
}

export function emitRTLDirection(rtl: boolean) {
  return rtl ? "rtl" : "ltr";
}

export function computeDirectionStyles(isRTL: boolean, element: LitElement) {
  const direction: string = emitRTLDirection(isRTL);
  setDirectionStyles(direction, element);
}

export function setDirectionStyles(direction: string, element: LitElement) {
  document.dir = direction;
  element.style.direction = direction;
  element.style.setProperty("--direction", direction);
  element.style.setProperty(
    "--float-start",
    direction === "ltr" ? "left" : "right"
  );
  element.style.setProperty(
    "--float-end",
    direction === "ltr" ? "right" : "left"
  );
  element.style.setProperty(
    "--scale-direction",
    direction === "ltr" ? "1" : "-1"
  );
}
