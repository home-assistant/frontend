import { HomeAssistant } from "../../types";
import "../../resources/intl-polyfill";

export const longConjunctionFormatter = (
  hass: HomeAssistant
): Intl.ListFormat =>
  new Intl.ListFormat(hass.language, {
    style: "long",
    type: "conjunction",
  });

export const longDisjunctionFormatter = (
  hass: HomeAssistant
): Intl.ListFormat =>
  new Intl.ListFormat(hass.language, {
    style: "long",
    type: "disjunction",
  });
