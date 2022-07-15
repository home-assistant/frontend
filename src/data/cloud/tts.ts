import { caseInsensitiveStringCompare } from "../../common/string/compare";
import { LocalizeFunc } from "../../common/translations/localize";
import { translationMetadata } from "../../resources/translations-metadata";
import { HomeAssistant } from "../../types";

export interface CloudTTSInfo {
  languages: Array<[string, string]>;
}

export const getCloudTTSInfo = (hass: HomeAssistant) =>
  hass.callWS<CloudTTSInfo>({ type: "cloud/tts/info" });

export const getCloudTtsLanguages = (info?: CloudTTSInfo) => {
  const languages: Array<[string, string]> = [];

  if (!info) {
    return languages;
  }

  const seen = new Set<string>();
  for (const [lang] of info.languages) {
    if (seen.has(lang)) {
      continue;
    }
    seen.add(lang);

    let label = lang;

    if (lang in translationMetadata.translations) {
      label = translationMetadata.translations[lang].nativeName;
    } else {
      const [langFamily, dialect] = lang.split("-");
      if (langFamily in translationMetadata.translations) {
        label = `${translationMetadata.translations[langFamily].nativeName}`;

        if (langFamily.toLowerCase() !== dialect.toLowerCase()) {
          label += ` (${dialect})`;
        }
      }
    }

    languages.push([lang, label]);
  }
  return languages.sort((a, b) => caseInsensitiveStringCompare(a[1], b[1]));
};

export const getCloudTtsSupportedGenders = (
  language: string,
  info: CloudTTSInfo | undefined,
  localize: LocalizeFunc
) => {
  const genders: Array<[string, string]> = [];

  if (!info) {
    return genders;
  }

  for (const [curLang, gender] of info.languages) {
    if (curLang === language) {
      genders.push([
        gender,
        gender === "male" || gender === "female"
          ? localize(`ui.panel.config.cloud.account.tts.${gender}`)
          : gender,
      ]);
    }
  }

  return genders.sort((a, b) => caseInsensitiveStringCompare(a[1], b[1]));
};
