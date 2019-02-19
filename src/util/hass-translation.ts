import { translationMetadata } from "../resources/translations-metadata";
import { fetchFrontendUserData } from "../data/frontend-user-data";
import { HomeAssistant } from "../types";

/**
 * Search for a matching translation from most specific to general
 */
function findAvilableLanguage(language: string) {
  // Perform case-insenstive comparison since browser isn't required to
  // report languages with specific cases.
  const avilableLanguages = {
    "zh-cn": "zh-Hans",
    "zh-sg": "zh-Hans",
    "zh-my": "zh-Hans",
    "zh-tw": "zh-Hant",
    "zh-hk": "zh-Hant",
    "zh-mo": "zh-Hant",
  };
  Object.keys(translationMetadata.translations).forEach((tr) => {
    avilableLanguages[tr.toLowerCase()] = tr;
  });

  return avilableLanguages[language.toLowerCase()];
}

/**
 * Get user selected language from backend
 */
export async function getUserLanguage(hass: HomeAssistant) {
  const userLanguage = await fetchFrontendUserData(hass, "language");
  if (userLanguage) {
    const language = findAvilableLanguage(userLanguage);
    if (language) {
      return language;
    }
  }
  return getLocalLanguage();
}

/**
 * Get browser specific language
 */
export function getLocalLanguage() {
  let language = null;
  if (navigator.languages) {
    for (const locale of navigator.languages) {
      language = findAvilableLanguage(locale);
      if (language) {
        return language;
      }
    }
  }
  language = findAvilableLanguage(navigator.language);
  if (language) {
    return language;
  }
  if (navigator.language && navigator.language.includes("-")) {
    language = findAvilableLanguage(navigator.language.split("-")[0]);
    if (language) {
      return language;
    }
  }

  // Final fallback
  return "en";
}

// Store loaded translations in memory so translations are available immediately
// when DOM is created in Polymer. Even a cache lookup creates noticeable latency.
const translations = {};

export async function getTranslation(
  fragment: string | null,
  language: string
) {
  const metadata = translationMetadata.translations[language];
  if (!metadata) {
    if (language !== "en") {
      return getTranslation(fragment, "en");
    }
    throw new Error("Language en is not found in metadata");
  }
  const translationFingerprint =
    metadata.fingerprints[fragment ? `${fragment}/${language}` : language];

  // Fetch translation from the server
  if (!translations[translationFingerprint]) {
    try {
      const response = await fetch(
        `/static/translations/${translationFingerprint}`,
        { credentials: "same-origin" }
      );
      if (!response.ok) {
        throw new Error(
          `Fail to fetch translation ${translationFingerprint}: HTTP response status is ${
            response.status
          }`
        );
      }
      translations[translationFingerprint] = {
        language,
        data: await response.json(),
      };
    } catch (error) {
      delete translations[translationFingerprint];
      if (language !== "en") {
        // Couldn't load selected translation. Try a fall back to en before failing.
        return getTranslation(fragment, "en");
      }
      throw error;
    }
  }

  return translations[translationFingerprint];
}

// Load selected translation into memory immediately so it is ready when Polymer
// initializes.
getTranslation(null, getLocalLanguage());
