import { shouldPolyfill as shouldPolyfillDateTime } from "@formatjs/intl-datetimeformat/lib/should-polyfill";
import { shouldPolyfill as shouldPolyfillDisplayName } from "@formatjs/intl-displaynames/lib/should-polyfill";
import { shouldPolyfill as shouldPolyfillLocale } from "@formatjs/intl-locale/lib/should-polyfill";
import { shouldPolyfill as shouldPolyfillPluralRules } from "@formatjs/intl-pluralrules/lib/should-polyfill";
import { shouldPolyfill as shouldPolyfillRelativeTime } from "@formatjs/intl-relativetimeformat/lib/should-polyfill";
import { getLocalLanguage } from "../util/common-translation";
import { polyfillLocaleData } from "./locale-data-polyfill";

const polyfillIntl = async () => {
  const locale = getLocalLanguage();
  const polyfills: Promise<unknown>[] = [];

  if (shouldPolyfillLocale()) {
    await import("@formatjs/intl-locale/polyfill");
  }
  if (shouldPolyfillPluralRules(locale)) {
    polyfills.push(
      import("@formatjs/intl-pluralrules/polyfill"),
      import("@formatjs/intl-pluralrules/locale-data/en")
    );
  }
  if (shouldPolyfillRelativeTime(locale)) {
    polyfills.push(import("@formatjs/intl-relativetimeformat/polyfill"));
  }
  if (shouldPolyfillDateTime(locale)) {
    polyfills.push(
      import("@formatjs/intl-datetimeformat/polyfill"),
      import("@formatjs/intl-datetimeformat/add-all-tz")
    );
  }
  if (shouldPolyfillDisplayName(locale)) {
    polyfills.push(
      import("@formatjs/intl-displaynames/polyfill"),
      import("@formatjs/intl-displaynames/locale-data/en")
    );
  }
  await Promise.all(polyfills).then(() =>
    // Load the default language
    polyfillLocaleData(locale)
  );
};

await polyfillIntl();
