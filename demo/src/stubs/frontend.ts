import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

let sidebarChangeCallback;

export const mockFrontend = (hass: MockHomeAssistant) => {
  hass.mockWS("frontend/get_user_data", () => ({ value: null }));
  hass.mockWS("frontend/set_user_data", ({ key, value }) => {
    if (key === "sidebar") {
      sidebarChangeCallback?.({
        value: {
          panelOrder: value.panelOrder || [],
          hiddenPanels: value.hiddenPanels || [],
        },
      });
    }
  });
  hass.mockWS("frontend/subscribe_user_data", (msg, _hass, onChange) => {
    if (msg.key === "sidebar") {
      sidebarChangeCallback = onChange;
    }
    onChange?.({ value: null });
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
  });
  hass.mockWS(
    "frontend/subscribe_system_data",
    (_msg, currentHass, onChange) => {
      onChange?.({
        value: currentHass.systemData,
      });
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    }
  );
  hass.mockWS("labs/subscribe", (_msg, _currentHass, onChange) => {
    onChange?.({
      preview_feature: _msg.preview_feature,
      domain: _msg.domain,
      enabled: false,
      is_built_in: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
  });
  hass.mockWS("repairs/list_issues", () => ({ issues: [] }));
  hass.mockWS("frontend/get_themes", (_msg, currentHass) => currentHass.themes);
};
