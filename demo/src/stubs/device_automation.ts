import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

// The demo's devices don't expose device-specific automations, so report empty
// lists and no extra capability fields for the device automation pickers.
export const mockDeviceAutomation = (hass: MockHomeAssistant) => {
  hass.mockWS("device_automation/trigger/list", () => []);
  hass.mockWS("device_automation/condition/list", () => []);
  hass.mockWS("device_automation/action/list", () => []);
  hass.mockWS("device_automation/trigger/capabilities", () => ({
    extra_fields: [],
  }));
  hass.mockWS("device_automation/condition/capabilities", () => ({
    extra_fields: [],
  }));
  hass.mockWS("device_automation/action/capabilities", () => ({
    extra_fields: [],
  }));
};
