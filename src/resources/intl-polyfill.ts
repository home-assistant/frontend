import { shouldPolyfill as shouldPolyfillDateTimeFormat } from "@formatjs/intl-datetimeformat/should-polyfill";
import { shouldPolyfill as shouldPolyfillDisplayNames } from "@formatjs/intl-displaynames/should-polyfill";
import { shouldPolyfill as shouldPolyfillGetCanonicalLocales } from "@formatjs/intl-getcanonicallocales/should-polyfill";
import { shouldPolyfill as shouldPolyfillListFormat } from "@formatjs/intl-listformat/should-polyfill";
import { shouldPolyfill as shouldPolyfillLocale } from "@formatjs/intl-locale/should-polyfill";
import { shouldPolyfill as shouldPolyfillNumberFormat } from "@formatjs/intl-numberformat/should-polyfill";
import { shouldPolyfill as shouldPolyfillPluralRules } from "@formatjs/intl-pluralrules/should-polyfill";
import { shouldPolyfill as shouldPolyfillRelativeTimeFormat } from "@formatjs/intl-relativetimeformat/should-polyfill";
import { getLocalLanguage } from "../util/common-translation";
import {
  polyfillLocaleData,
  polyfillTimeZoneData,
} from "./locale-data-polyfill";

const polyfillIntl = async () => {
  const locale = getLocalLanguage();
  const polyfills: Promise<unknown>[] = [];
  if (shouldPolyfillGetCanonicalLocales()) {
    await import("@formatjs/intl-getcanonicallocales/polyfill-force");
  }
  if (shouldPolyfillLocale()) {
    await import("@formatjs/intl-locale/polyfill-force");
  }
  if (shouldPolyfillDateTimeFormat(locale)) {
    polyfills.push(
      import("@formatjs/intl-datetimeformat/polyfill-force").then(() =>
        polyfillTimeZoneData()
      )
    );
  }
  if (shouldPolyfillDisplayNames(locale)) {
    polyfills.push(import("@formatjs/intl-displaynames/polyfill-force"));
  }
  if (shouldPolyfillListFormat(locale)) {
    polyfills.push(import("@formatjs/intl-listformat/polyfill-force"));
  }
  if (shouldPolyfillNumberFormat(locale)) {
    polyfills.push(import("@formatjs/intl-numberformat/polyfill-force"));
  }
  if (shouldPolyfillPluralRules(locale)) {
    polyfills.push(
      import("@formatjs/intl-pluralrules/polyfill-force").then(
        // Locale data for plural rules breaks current JSON conversions as it includes functions,
        // so only import English to avoid huge bundles
        // TODo: Setup JS imports instead of JSON fetches
        () => import("@formatjs/intl-pluralrules/locale-data/en")
      )
    );
  }
  if (shouldPolyfillRelativeTimeFormat(locale)) {
    polyfills.push(import("@formatjs/intl-relativetimeformat/polyfill-force"));
  }
  if (polyfills.length === 0) {
    return;
  }
  await Promise.all(polyfills).then(() =>
    // Load the default language
    polyfillLocaleData(locale)
  );
};

await polyfillIntl();
