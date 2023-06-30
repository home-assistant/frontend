import memoizeOne from "memoize-one";
import "../../resources/intl-polyfill";
import { FrontendLocaleData } from "../../data/translation";

export const formatListWithAnds = (
  locale: FrontendLocaleData,
  list: string[]
) => formatConjunctionList(locale).format(list);

export const formatListWithOrs = (locale: FrontendLocaleData, list: string[]) =>
  formatDisjunctionList(locale).format(list);

const formatConjunctionList = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.ListFormat(locale.language, {
      style: "long",
      type: "conjunction",
    })
);

const formatDisjunctionList = memoizeOne(
  (locale: FrontendLocaleData) =>
    new Intl.ListFormat(locale.language, {
      style: "long",
      type: "disjunction",
    })
);
