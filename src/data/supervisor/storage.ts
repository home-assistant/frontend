import type { HomeAssistant } from "../../types";

export interface SupervisorStorageInfo {
  addons: {
    total: number;
    children: Record<string, number>;
  };
  media: {
    total: number;
    children: Record<string, number>;
  };
  share: {
    total: number;
    children: Record<string, number>;
  };
  backup: {
    total: number;
    children: Record<string, number>;
  };
  tmp: {
    total: number;
    children: Record<string, number>;
  };
  config: {
    total: number;
    children: Record<string, number>;
  };
}

export const fetchSupervisorStorageInfo = async (
  hass: HomeAssistant
): Promise<SupervisorStorageInfo> =>
  hass.callWS<SupervisorStorageInfo>({
    type: "supervisor/storage/info",
  });
