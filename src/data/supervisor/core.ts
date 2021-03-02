import { atLeastVersion } from "../../common/config/version";
import { fireEvent } from "../../common/dom/fire_event";
import { HomeAssistant } from "../../types";
import { HassioResponse } from "../hassio/common";

export const restartCore = async (hass: HomeAssistant) => {
  await hass.callService("homeassistant", "restart");
};

export const updateCore = async (element: HTMLElement, hass: HomeAssistant) => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: "/core/update",
      method: "post",
      timeout: null,
    });
  } else {
    await hass.callApi<HassioResponse<void>>("POST", `hassio/core/update`);
  }

  fireEvent(element, "supervisor-colllection-refresh", {
    colllection: "core",
  });
};
