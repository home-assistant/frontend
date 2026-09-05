import type { IntegrationManifest } from "../../../src/data/integration";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { connectivityManifests } from "./connectivity/fixtures";
import { manifest } from "./manifest";

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
  ...connectivityManifests,
];

export const mockIntegration = (hass: MockHomeAssistant) => {
  hass.mockWS("manifest/list", () => manifests);
  // Never answer with undefined: the integration page reads the manifest it
  // gets back without guarding, so an unlisted domain would throw. The real
  // backend always has a manifest for a domain that has config entries.
  hass.mockWS(
    "manifest/get",
    (msg: { integration: string }) =>
      manifests.find((m) => m.domain === msg.integration) ??
      manifest(msg.integration, msg.integration)
  );
};
