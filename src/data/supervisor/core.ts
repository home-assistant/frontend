import { atLeastVersion } from "../../common/config/version";
import type { HomeAssistant } from "../../types";
import type { HassioResponse } from "../hassio/common";

export const restartCore = async (hass: HomeAssistant) => {
  await hass.callService("homeassistant", "restart");
};

export const updateCore = async (hass: HomeAssistant, backup: boolean) => {
  if (atLeastVersion(hass.config.version, 2025, 2, 0)) {
    await hass.callWS({
      type: "hassio/update/core",
      backup: backup,
    });
    return;
  }

  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: "/core/update",
      method: "post",
      timeout: null,
      data: { backup },
    });
    return;
  }

  await hass.callApi<HassioResponse<void>>("POST", "hassio/core/update", {
    backup,
  });
};
