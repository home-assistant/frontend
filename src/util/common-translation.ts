import { translationMetadata } from "../resources/translations-metadata";

const DEFAULT_BASE_URL = "/static/translations";

// Store loaded translations in memory so translations are available immediately
// when DOM is created in Polymer. Even a cache lookup creates noticeable latency.
const translations = {};

async function fetchTranslation(fingerprint: string, base_url: string) {
  const response = await fetch(`${base_url}/${fingerprint}`, {
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error(
      `Fail to fetch translation ${fingerprint}: HTTP response status is ${response.status}`
    );
  }
  return response.json();
}

export async function getTranslation(
  fragment: string | null,
  language: string,
  base_url?: string
) {
  const metadata = translationMetadata.translations[language];
  if (!metadata) {
    if (language !== "en") {
      return getTranslation(fragment, "en", base_url);
    }
    throw new Error("Language en is not found in metadata");
  }

  // nl-abcd.jon or logbook/nl-abcd.json
  const fingerprint = `${fragment ? fragment + "/" : ""}${language}-${
    metadata.hash
  }.json`;

  // Fetch translation from the server
  if (!translations[fingerprint]) {
    translations[fingerprint] = fetchTranslation(
      fingerprint,
      base_url || DEFAULT_BASE_URL
    )
      .then((data) => ({ language, data }))
      .catch((error) => {
        delete translations[fingerprint];
        if (language !== "en") {
          // Couldn't load selected translation. Try a fall back to en before failing.
          return getTranslation(fragment, "en", base_url);
        }
        return Promise.reject(error);
      });
  }
  return translations[fingerprint];
}
