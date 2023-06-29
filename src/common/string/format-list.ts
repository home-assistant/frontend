import { HomeAssistant } from "../../types";
import "../../resources/intl-polyfill";
import memoizeOne from "memoize-one";

export const formatListWithAnds = (hass: HomeAssistant, list: string[]) =>
  formatConjunctionList(hass).format(list);

export const formatListWithOrs = (hass: HomeAssistant, list: string[]) =>
  formatDisjunctionList(hass).format(list);

const formatConjunctionList = memoizeOne(
  (hass: HomeAssistant) =>
    new Intl.ListFormat(hass.language, {
      style: "long",
      type: "conjunction",
    })
);

const formatDisjunctionList = memoizeOne(
  (hass: HomeAssistant) =>
    new Intl.ListFormat(hass.language, {
      style: "long",
      type: "disjunction",
    })
);
