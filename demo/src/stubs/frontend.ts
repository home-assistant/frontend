import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

let changeFunction;

export const mockFrontend = (hass: MockHomeAssistant) => {
  hass.mockWS("frontend/get_user_data", () => ({
    value: null,
  }));
  hass.mockWS("frontend/set_user_data", ({ key, value }) => {
    if (key === "sidebar") {
      changeFunction?.({
        value: {
          panelOrder: value.panelOrder || [],
          hiddenPanels: value.hiddenPanels || [],
        },
      });
    }
  });
  hass.mockWS("frontend/subscribe_user_data", (_msg, _hass, onChange) => {
    changeFunction = onChange;
    onChange?.({
      value: {
        panelOrder: [],
        hiddenPanels: [],
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
  });
};
