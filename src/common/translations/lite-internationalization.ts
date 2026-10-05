import {
  DateFormat,
  FirstWeekday,
  NumberFormat,
  TimeFormat,
  TimeZone,
} from "../../data/translation";
import { translationMetadata } from "../../resources/translations-metadata";
import type { HomeAssistantInternationalization } from "../../types";
import type { LocalizeFunc } from "./localize";

/**
 * Builds an internationalization context value for the "lite" localize mode
 * used before a `hass` object exists. Locale falls back to browser defaults and
 * the lazy loaders are stubs that warn when called.
 */
export const buildLiteInternationalization = (
  language: string,
  localize: LocalizeFunc
): HomeAssistantInternationalization => ({
  language,
  selectedLanguage: language,
  locale: {
    language,
    number_format: NumberFormat.language,
    time_format: TimeFormat.language,
    date_format: DateFormat.language,
    time_zone: TimeZone.local,
    first_weekday: FirstWeekday.language,
  },
  localize,
  translationMetadata,
  loadBackendTranslation: async (category, integrations, configFlow) => {
    // eslint-disable-next-line no-console
    console.warn(
      "loadBackendTranslation called in lite i18n mode; backend strings are not available",
      { category, integrations, configFlow }
    );
    return localize;
  },
  loadFragmentTranslation: async (fragment) => {
    // eslint-disable-next-line no-console
    console.warn(
      `loadFragmentTranslation("${fragment}") called in lite i18n mode; fragment not loaded`
    );
    return undefined;
  },
});
