import type { HomeAssistant } from "../../types";

export const restartCore = async (hass: HomeAssistant) => {
  await hass.callService("homeassistant", "restart");
};

export const updateCore = async (hass: HomeAssistant, backup: boolean) => {
  await hass.callWS({
    type: "hassio/update/core",
    backup: backup,
  });
};
