import { shouldPolyfill as shouldPolyfillDateTime } from "@formatjs/intl-datetimeformat/should-polyfill";
import { shouldPolyfill as shouldPolyfillDisplayName } from "@formatjs/intl-displaynames/should-polyfill";
import { shouldPolyfill as shouldPolyfillLocale } from "@formatjs/intl-locale/should-polyfill";
import { shouldPolyfill as shouldPolyfillPluralRules } from "@formatjs/intl-pluralrules/should-polyfill";
import { shouldPolyfill as shouldPolyfillRelativeTime } from "@formatjs/intl-relativetimeformat/should-polyfill";
import { shouldPolyfill as shouldPolyfillListFormat } from "@formatjs/intl-listformat/should-polyfill";
import { getLocalLanguage } from "../util/common-translation";
import {
  polyfillLocaleData,
  polyfillTimeZoneData,
} from "./locale-data-polyfill";

const polyfillIntl = async () => {
  const locale = getLocalLanguage();
  const polyfills: Promise<unknown>[] = [];

  if (shouldPolyfillLocale()) {
    await import("@formatjs/intl-locale/polyfill-force");
  }
  if (shouldPolyfillPluralRules(locale)) {
    polyfills.push(import("@formatjs/intl-pluralrules/polyfill-force"));
  }
  if (shouldPolyfillRelativeTime(locale)) {
    polyfills.push(import("@formatjs/intl-relativetimeformat/polyfill-force"));
  }
  if (shouldPolyfillDateTime(locale)) {
    polyfills.push(
      import("@formatjs/intl-datetimeformat/polyfill-force").then(() =>
        polyfillTimeZoneData()
      )
    );
  }
  if (shouldPolyfillDisplayName(locale)) {
    polyfills.push(import("@formatjs/intl-displaynames/polyfill-force"));
  }
  if (shouldPolyfillListFormat(locale)) {
    polyfills.push(import("@formatjs/intl-listformat/polyfill-force"));
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
