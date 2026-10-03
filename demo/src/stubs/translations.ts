import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { connectivityBackendTranslations } from "./connectivity/fixtures";

export const mockTranslations = (
  hass: MockHomeAssistant,
  localizePromise?: Promise<LocalizeFunc>
) => {
  hass.mockWS(
    "frontend/get_translations",
    (msg: { language: string; category?: string }) => ({
      resources:
        (msg.category && connectivityBackendTranslations[msg.category]) || {},
    })
  );

  // `hass.loadBackendTranslation` is a no-op in the mocked hass, so categories
  // that are only requested through it never reach the WebSocket mock above.
  // Seed every category into the resources, after the fragment translations so
  // this merges on top of them.
  (localizePromise ?? Promise.resolve()).then(() =>
    hass.addTranslations(
      Object.assign({}, ...Object.values(connectivityBackendTranslations))
    )
  );
};
