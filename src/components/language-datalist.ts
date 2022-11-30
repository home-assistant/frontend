import { HomeAssistant } from "../types";

export const createLanguageListEl = (hass: HomeAssistant) => {
  const list = document.createElement("datalist");
  list.id = "languages";
  for (const [language, metadata] of Object.entries(
    hass.translationMetadata.translations
  )) {
    const option = document.createElement("option");
    option.value = language;
    option.innerText = metadata.nativeName;
    list.appendChild(option);
  }
  return list;
};
