import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockAssist = (hass: MockHomeAssistant) => {
  // Stub for assist pipeline list — returns empty so developer tools assist
  // tab loads without errors.
  hass.mockWS("assist_pipeline/pipeline/list", () => ({
    pipelines: [],
    preferred_pipeline: null,
  }));

  // Stub for assist pipeline run — immediately sends run-end event so
  // the UI does not hang waiting for a response.
  hass.mockWS("assist_pipeline/run", (_msg, _hass, onChange) => {
    if (onChange) {
      onChange({
        type: "run-end",
      });
    }
    return null;
  });
};
