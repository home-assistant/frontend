import type { HomeAssistant } from "../../types";

export interface SupervisorStorageInfoChild {
  size: number;
  children?: Record<string, SupervisorStorageInfoChild>;
}

export type SupervisorStorageInfo = Record<
  string,
  Record<string, SupervisorStorageInfoChild>
>;

const STORAGE_MOCK_DATA = {
  result: "ok",
  data: {
    "66312": {
      addons: { size: 42152236115 },
      media: { size: 319699964 },
      share: { size: 37018597972 },
      backup: { size: 229413120000 },
      tmp: { size: 386560037 },
      config: { size: 377300071 },
    },
  } as SupervisorStorageInfo,
};

export const fetchSupervisorStorageInfo = async (
  _hass: HomeAssistant
): Promise<SupervisorStorageInfo> => STORAGE_MOCK_DATA.data;
//   hass.callWS<SupervisorStorageInfo>({
//     type: "supervisor/storage/info",
//   });
