import { caseInsensitiveStringCompare } from "../../common/string/compare";
import { HomeAssistant } from "../../types";

export interface CloudTTSInfo {
  languages: Array<[string, string]>;
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

export const getCloudTtsSupportedVoices = (
  language: string,
  info: CloudTTSInfo | undefined
) => {
  const voices: Array<string> = [];

  if (!info) {
    return voices;
  }

  for (const [curLang, voice] of info.languages) {
    if (curLang === language) {
      voices.push(voice);
    }
  }

  return voices.sort((a, b) => caseInsensitiveStringCompare(a, b));
};
