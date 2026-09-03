import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

// Backend translations the connectivity panels look up. The real backend serves
// these per integration; keys are the flat localize keys.
const ENTITY_COMPONENT_RESOURCES: Record<string, string> = {
  "component.infrared.entity_component._.name": "Emitter",
  "component.infrared.entity_component.receiver.name": "Receiver",
  "component.radio_frequency.entity_component._.name": "Transceiver",
};

// `hass.loadBackendTranslation` is a no-op in the mocked hass, so categories
// that are only requested through it never reach the WebSocket mock. Seed them
// into the resources instead.
const PRESEEDED_RESOURCES: Record<string, string> = {
  "component.zha.config_panel.zha_options.title": "Global options",
  "component.zha.config_panel.zha_alarm_options.title": "Alarm options",
};

export const mockTranslations = (
  hass: MockHomeAssistant,
  localizePromise?: Promise<LocalizeFunc>
) => {
  hass.mockWS(
    "frontend/get_translations",
    (msg: { language: string; category?: string }) => ({
      resources:
        msg.category === "entity_component" ? ENTITY_COMPONENT_RESOURCES : {},
    })
  );

  // Wait for the fragment translations so this merges on top of them.
  (localizePromise ?? Promise.resolve()).then(() =>
    hass.addTranslations(PRESEEDED_RESOURCES)
  );
};
