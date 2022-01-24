import { HomeAssistant } from "../../types";

interface SupervisorBaseAvailableUpdates {
  panel_path?: string;
  update_type?: string;
  version_latest?: string;
}

interface SupervisorAddonAvailableUpdates
  extends SupervisorBaseAvailableUpdates {
  update_type?: "addon";
  icon?: string;
  name?: string;
}

interface SupervisorCoreAvailableUpdates
  extends SupervisorBaseAvailableUpdates {
  update_type?: "core";
}

interface SupervisorOsAvailableUpdates extends SupervisorBaseAvailableUpdates {
  update_type?: "os";
}

interface SupervisorSupervisorAvailableUpdates
  extends SupervisorBaseAvailableUpdates {
  update_type?: "supervisor";
}

export type SupervisorAvailableUpdates =
  | SupervisorAddonAvailableUpdates
  | SupervisorCoreAvailableUpdates
  | SupervisorOsAvailableUpdates
  | SupervisorSupervisorAvailableUpdates;

export interface SupervisorAvailableUpdatesResponse {
  available_updates: SupervisorAvailableUpdates[];
}

export const fetchSupervisorAvailableUpdates = async (
  hass: HomeAssistant
): Promise<SupervisorAvailableUpdates[]> =>
  (
    await hass.callWS<SupervisorAvailableUpdatesResponse>({
      type: "supervisor/api",
      endpoint: "/available_updates",
      method: "get",
    })
  ).available_updates;

export const refreshSupervisorAvailableUpdates = async (
  hass: HomeAssistant
): Promise<void> =>
  hass.callWS<void>({
    type: "supervisor/api",
    endpoint: "/refresh_updates",
    method: "post",
  });
