import { translationMetadata } from "../resources/translations-metadata";

export function getActiveTranslation() {
  // Perform case-insenstive comparison since browser isn't required to
  // report languages with specific cases.
  const lookup = {};
  /* eslint-disable no-undef */
  Object.keys(translationMetadata.translations).forEach((tr) => {
    lookup[tr.toLowerCase()] = tr;
  });

  // Search for a matching translation from most specific to general
  function languageGetTranslation(language) {
    const lang = language.toLowerCase();

    if (lookup[lang]) {
      return lookup[lang];
    }
    if (lang.split("-")[0] === "zh") {
      return lang === "zh-cn" || lang === "zh-sg" ? "zh-Hans" : "zh-Hant";
    }
    return null;
  }

  let translation = null;
  let selectedLanguage;
  if (window.localStorage.selectedLanguage) {
    try {
      selectedLanguage = JSON.parse(window.localStorage.selectedLanguage);
    } catch (e) {
      // Ignore parsing error.
    }
  }
  if (selectedLanguage) {
    translation = languageGetTranslation(selectedLanguage);
    if (translation) {
      return translation;
    }
  }
  if (navigator.languages) {
    for (let locale of navigator.languages) {
      // remove country specific name until match or empty string
      while (locale) {
        translation = languageGetTranslation(locale);
        if (translation) {
          return translation;
        }

        locale = locale.slice(0, locale.lastIndexOf("-"));
      }
    }
  }
  translation = languageGetTranslation(navigator.language);
  if (translation) {
    return translation;
  }

  // Final fallback
  return "en";
}

// Store loaded translations in memory so translations are available immediately
// when DOM is created in Polymer. Even a cache lookup creates noticeable latency.
const translations = {};

export function getTranslation(fragment?, translationInput?) {
  const translation = translationInput || getActiveTranslation();
  const metadata = translationMetadata.translations[translation];
  if (!metadata) {
    if (translationInput !== "en") {
      return getTranslation(fragment, "en");
    }
    return Promise.reject(new Error("Language en not found in metadata"));
  }
  const translationFingerprint =
    metadata.fingerprints[
      fragment ? `${fragment}/${translation}` : translation
    ];

  // Create a promise to fetch translation from the server
  if (!translations[translationFingerprint]) {
    translations[translationFingerprint] = fetch(
      `/static/translations/${translationFingerprint}`,
      { credentials: "same-origin" }
    )
      .then((response) => response.json())
      .then((data) => ({
        language: translation,
        data,
      }))
      .catch((error) => {
        delete translations[translationFingerprint];
        if (translationInput !== "en") {
          // Couldn't load selected translation. Try a fall back to en before failing.
          return getTranslation(fragment, "en");
        }
        return Promise.reject(error);
      });
  }
  return translations[translationFingerprint];
}

// Load selected translation into memory immediately so it is ready when Polymer
// initializes.
getTranslation();
