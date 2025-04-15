import type { HomeAssistant } from "../../types";

export interface SupervisorUpdateConfig {
  add_on_backup_before_update: boolean;
  add_on_backup_retain_copies?: number;
  core_backup_before_update: boolean;
}

export const getSupervisorUpdateConfig = async (hass: HomeAssistant) =>
  hass.callWS<SupervisorUpdateConfig>({
    type: "hassio/update/config/info",
  });

export const updateSupervisorUpdateConfig = async (
  hass: HomeAssistant,
  config: Partial<SupervisorUpdateConfig>
) =>
  hass.callWS({
    type: "hassio/update/config/update",
    ...config,
  });
