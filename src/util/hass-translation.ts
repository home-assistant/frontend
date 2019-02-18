import { translationMetadata } from "../resources/translations-metadata";
import { fetchFrontendUserData } from "../data/frontend-user-data";
import { HomeAssistant } from "../types";

// Perform case-insenstive comparison since browser isn't required to
// report languages with specific cases.
const TRANSLATION_LOOKUP = {};
Object.keys(translationMetadata.translations).forEach((tr) => {
  TRANSLATION_LOOKUP[tr.toLowerCase()] = tr;
});

// Search for a matching translation from most specific to general
function languageGetTranslation(language) {
  const lang = language.toLowerCase();

  if (TRANSLATION_LOOKUP[lang]) {
    return TRANSLATION_LOOKUP[lang];
  }
  if (lang.split("-")[0] === "zh") {
    return lang === "zh-cn" || lang === "zh-sg" ? "zh-Hans" : "zh-Hant";
  }
  return null;
}

export async function getActiveTranslation(hass?: HomeAssistant) {
  let selectedLanguage = null;
  if (hass) {
    selectedLanguage = await fetchFrontendUserData(hass, "language");
  }
  if (selectedLanguage) {
    const translation = languageGetTranslation(selectedLanguage);
    if (translation) {
      return translation;
    }
  }
  return getLocalTranslation();
}

export function getLocalTranslation() {
  let translation = null;
  if (navigator.languages) {
    for (const locale of navigator.languages) {
      translation = languageGetTranslation(locale);
      if (translation) {
        return translation;
      }
    }
  }
  translation = languageGetTranslation(navigator.language);
  if (translation) {
    return translation;
  }
  if (navigator.language.includes("-")) {
    translation = languageGetTranslation(navigator.language.split("-")[0]);
    if (translation) {
      return translation;
    }
  }

  // Final fallback
  return "en";
}

// Store loaded translations in memory so translations are available immediately
// when DOM is created in Polymer. Even a cache lookup creates noticeable latency.
const translations = {};

export async function getTranslation(hass?, fragment?, translationInput?) {
  const translation = translationInput || (await getActiveTranslation(hass));
  const metadata = translationMetadata.translations[translation];
  if (!metadata) {
    if (translationInput !== "en") {
      return getTranslation(hass, fragment, "en");
    }
    return Promise.reject(new Error("Language en not found in metadata"));
  }
  const translationFingerprint =
    metadata.fingerprints[
      fragment ? `${fragment}/${translation}` : translation
    ];

  // Fetch translation from the server
  if (!translations[translationFingerprint]) {
    try {
      const response = await fetch(
        `/static/translations/${translationFingerprint}`,
        { credentials: "same-origin" }
      );
      translations[translationFingerprint] = {
        language: translation,
        data: await response.json(),
      };
    } catch (error) {
      delete translations[translationFingerprint];
      if (translationInput !== "en") {
        // Couldn't load selected translation. Try a fall back to en before failing.
        return getTranslation(hass, fragment, "en");
      }
      throw error;
    }
  }

  return translations[translationFingerprint];
}

// Load selected translation into memory immediately so it is ready when Polymer
// initializes.
getTranslation(null);
