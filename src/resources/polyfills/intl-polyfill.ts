import { shouldPolyfill as shouldPolyfillDateTimeFormat } from "@formatjs/intl-datetimeformat/should-polyfill";
import { shouldPolyfill as shouldPolyfillDisplayNames } from "@formatjs/intl-displaynames/should-polyfill";
import { shouldPolyfill as shouldPolyfillGetCanonicalLocales } from "@formatjs/intl-getcanonicallocales/should-polyfill";
import { shouldPolyfill as shouldPolyfillListFormat } from "@formatjs/intl-listformat/should-polyfill";
import { shouldPolyfill as shouldPolyfillLocale } from "@formatjs/intl-locale/should-polyfill";
import { shouldPolyfill as shouldPolyfillNumberFormat } from "@formatjs/intl-numberformat/should-polyfill";
import { shouldPolyfill as shouldPolyfillPluralRules } from "@formatjs/intl-pluralrules/should-polyfill";
import { shouldPolyfill as shouldPolyfillRelativeTimeFormat } from "@formatjs/intl-relativetimeformat/should-polyfill";
import { shouldPolyfill as shouldPolyfillDurationFormat } from "@formatjs/intl-durationformat/should-polyfill";

import { getLocalLanguage } from "../../util/common-translation";
import {
  polyfillLocaleData,
  polyfillTimeZoneData,
} from "./locale-data-polyfill";

const _polyfillTimeZoneData = polyfillTimeZoneData;

// The DateTimeFormat and DurationFormat polyfills call BigInt() when formatting
const hasBigInt = typeof BigInt !== "undefined";

// The FormatJS DateTimeFormat polyfill defaults to UTC instead of the
// device's time zone. Both legacy bundles run this file, so the zone is read
// once, while Intl.DateTimeFormat is still native.
const readNativeTimeZone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (_err) {
    // Replaced by a polyfill that has no locale data yet
    return undefined;
  }
};

const nativeTimeZone = (globalThis.__haNativeTimeZone ??= readNativeTimeZone());

const setDefaultTimeZone = () => {
  if (!nativeTimeZone) {
    return;
  }
  try {
    (Intl.DateTimeFormat as any).__setDefaultTimeZone(nativeTimeZone);
  } catch (_err) {
    // No time zone data for it, so keep UTC
  }
};

const polyfillIntl = async () => {
  const locale = getLocalLanguage();
  const polyfills: Promise<unknown>[] = [];
  if (shouldPolyfillGetCanonicalLocales()) {
    await import("@formatjs/intl-getcanonicallocales/polyfill-force");
  }
  if (shouldPolyfillLocale()) {
    await import("@formatjs/intl-locale/polyfill-force");
  }
  if (hasBigInt && shouldPolyfillDateTimeFormat(locale)) {
    polyfills.push(
      import("@formatjs/intl-datetimeformat/polyfill-force")
        .then(() => _polyfillTimeZoneData())
        .then(setDefaultTimeZone)
    );
  }
  if (hasBigInt && shouldPolyfillDurationFormat()) {
    polyfills.push(import("@formatjs/intl-durationformat/polyfill-force"));
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
    // The polyfill and its English data are one chunk, so Intl.PluralRules
    // is never installed without data. Its should-polyfill probe calls
    // select(), which throws on a data-less polyfill.
    polyfills.push(import("./intl-pluralrules"));
  }
  if (shouldPolyfillRelativeTimeFormat(locale)) {
    polyfills.push(import("@formatjs/intl-relativetimeformat/polyfill-force"));
  }
  if (polyfills.length === 0) {
    return;
  }
  await Promise.allSettled(polyfills).then(() =>
    // Load the default language
    polyfillLocaleData(locale)
  );
};

// Each legacy entry bundle (core, app, authorize, onboarding) carries its own
// copy of this module, and the bundles load in parallel. A module-level flag
// only stops re-runs within one bundle, so a second bundle could probe
// Intl.* while the first was still loading locale data. Share one promise
// per page instead, so every bundle waits for the same run.
await (globalThis.__haIntlPolyfill ??= polyfillIntl());
