import type { HomeAssistant } from "../../types";

export interface SupervisorStorageInfo {
  total_bytes?: number;
  used_bytes: number;
  id: string;
  label: string;
  children?: SupervisorStorageInfo[];
}

const STORAGE_MOCK_DATA = {
  result: "ok",
  data: {
    id: "root",
    label: "Root",
    total_bytes: 503312781312,
    used_bytes: 431969026048,
    children: [
      { id: "system", label: "System", used_bytes: 77420687791 },
      { id: "addons_data", label: "addons_data", used_bytes: 42513415293 },
      { id: "addons_config", label: "addons_config", used_bytes: 5124483607 },
      { id: "media", label: "media", used_bytes: 494197781 },
      { id: "share", label: "share", used_bytes: 37477947961 },
      { id: "backup", label: "backup", used_bytes: 268343982080 },
      { id: "ssl", label: "ssl", used_bytes: 202912633 },
      { id: "homeassistant", label: "homeassistant", used_bytes: 391398902 },
    ],
  },
};

export const fetchSupervisorStorageInfo = async (
  _hass: HomeAssistant
): Promise<SupervisorStorageInfo> => STORAGE_MOCK_DATA.data;
//   hass.callWS<SupervisorStorageInfo>({
//     type: "supervisor/storage/info",
//   });
