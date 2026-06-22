import type { IntegrationManifest } from "../../../src/data/integration";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const manifest = (
  domain: string,
  name: string,
  overrides: Partial<IntegrationManifest> = {}
): IntegrationManifest => ({
  is_built_in: true,
  domain,
  name,
  config_flow: true,
  documentation: `https://www.home-assistant.io/integrations/${domain}/`,
  iot_class: "local_push",
  ...overrides,
});

const manifests: IntegrationManifest[] = [
  manifest("co2signal", "Electricity Maps", { iot_class: "cloud_polling" }),
  manifest("hue", "Philips Hue"),
  manifest("sonos", "Sonos"),
  manifest("met", "Met.no", { iot_class: "cloud_polling" }),
  // Helpers
  manifest("template", "Template", { integration_type: "helper" }),
  manifest("input_boolean", "Toggle", {
    config_flow: false,
    integration_type: "helper",
    iot_class: "local_polling",
  }),
  manifest("input_number", "Number", {
    config_flow: false,
    integration_type: "helper",
    iot_class: "local_polling",
  }),
  manifest("input_select", "Dropdown", {
    config_flow: false,
    integration_type: "helper",
    iot_class: "local_polling",
  }),
  manifest("input_text", "Text", {
    config_flow: false,
    integration_type: "helper",
    iot_class: "local_polling",
  }),
  manifest("input_datetime", "Date and/or time", {
    config_flow: false,
    integration_type: "helper",
    iot_class: "local_polling",
  }),
  manifest("counter", "Counter", {
    config_flow: false,
    integration_type: "helper",
    iot_class: "local_polling",
  }),
  manifest("timer", "Timer", {
    config_flow: false,
    integration_type: "helper",
    iot_class: "local_polling",
  }),
  manifest("schedule", "Schedule", {
    config_flow: false,
    integration_type: "helper",
    iot_class: "local_polling",
  }),
];

export const mockIntegration = (hass: MockHomeAssistant) => {
  hass.mockWS("manifest/list", () => manifests);
  hass.mockWS("manifest/get", (msg: { integration: string }) =>
    manifests.find((m) => m.domain === msg.integration)
  );
};
