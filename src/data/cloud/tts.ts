import type { HomeAssistant } from "../../types";

export interface CloudTTSInfo {
  languages: [
    // language
    string,
    // voice id
    string,
    // voice name
    string,
  ][];
}

export const getCloudTTSInfo = (hass: HomeAssistant) =>
  hass.callWS<CloudTTSInfo>({ type: "cloud/tts/info" });

export const getCloudTtsLanguages = (info?: CloudTTSInfo) => {
  const languages: string[] = [];

  if (!info) {
    return languages;
  }

  const seen = new Set<string>();
  for (const [lang] of info.languages) {
    if (seen.has(lang)) {
      continue;
    }
    seen.add(lang);
    languages.push(lang);
  }
  return languages;
};
