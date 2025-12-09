export interface ProcessedConfigurationUrl {
  url: string;
  isLocal: boolean;
}

/**
 * Get a processed configuration URL, converting homeassistant:// URLs to local paths
 * and determining if it should be opened locally or in a new tab.
 *
 * @param configurationUrl - The configuration URL to process
 * @returns Processed URL and whether it's a local link, or null if URL is empty
 */
export const getConfigurationUrl = (
  configurationUrl: string | null | undefined
): ProcessedConfigurationUrl | null => {
  if (!configurationUrl) {
    return null;
  }

  const isHomeAssistant = configurationUrl.startsWith("homeassistant://");
  const url = isHomeAssistant
    ? configurationUrl.replace("homeassistant://", "/")
    : configurationUrl;

  return {
    url,
    isLocal: isHomeAssistant,
  };
};
