import type { HomeAssistant } from "../../types";

export type LovelaceDashboard =
  | LovelaceYamlDashboard
  | LovelaceStorageDashboard;

interface LovelaceGenericDashboard {
  id: string;
  url_path: string;
  require_admin: boolean;
  show_in_sidebar: boolean;
  icon?: string;
  title: string;
}

export interface LovelaceYamlDashboard extends LovelaceGenericDashboard {
  mode: "yaml";
  filename: string;
}

export interface LovelaceStorageDashboard extends LovelaceGenericDashboard {
  mode: "storage";
}

export interface LovelaceDashboardMutableParams {
  require_admin: boolean;
  show_in_sidebar: boolean;
  icon?: string;
  title: string;
}

export interface LovelaceDashboardCreateParams
  extends LovelaceDashboardMutableParams {
  url_path: string;
  mode: "storage";
}

export const fetchDashboards = (
  hass: HomeAssistant
): Promise<LovelaceDashboard[]> =>
  hass.callWS({
    type: "lovelace/dashboards/list",
  });

export const createDashboard = (
  hass: HomeAssistant,
  values: LovelaceDashboardCreateParams
) =>
  hass.callWS<LovelaceDashboard>({
    type: "lovelace/dashboards/create",
    ...values,
  });

export const updateDashboard = (
  hass: HomeAssistant,
  id: string,
  updates: Partial<LovelaceDashboardMutableParams>
) =>
  hass.callWS<LovelaceDashboard>({
    type: "lovelace/dashboards/update",
    dashboard_id: id,
    ...updates,
  });

export const deleteDashboard = (hass: HomeAssistant, id: string) =>
  hass.callWS({
    type: "lovelace/dashboards/delete",
    dashboard_id: id,
  });
