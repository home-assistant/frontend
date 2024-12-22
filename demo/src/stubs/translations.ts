import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockTranslations = (hass: MockHomeAssistant) => {
  hass.mockWS(
    "frontend/get_translations",
    (/* msg: {language: string, category: string} */) => ({ resources: {} })
  );
};
