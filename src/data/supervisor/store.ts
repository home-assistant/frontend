import { atLeastVersion } from "../../common/config/version";
import { HomeAssistant } from "../../types";
import { AddonRepository, AddonStage } from "../hassio/addon";
import { hassioApiResultExtractor, HassioResponse } from "../hassio/common";

export interface StoreAddon {
  advanced: boolean;
  available: boolean;
  build: boolean;
  description: string;
  homeassistant: string | null;
  icon: boolean;
  installed: boolean;
  logo: boolean;
  name: string;
  repository: AddonRepository;
  slug: string;
  stage: AddonStage;
  update_available: boolean;
  url: string;
  version: string | null;
  version_latest: string;
}
interface StoreRepository {
  maintainer: string;
  name: string;
  slug: string;
  source: string;
  url: string;
}

export interface SupervisorStore {
  addons: StoreAddon[];
  repositories: StoreRepository[];
}

export const fetchSupervisorStore = async (
  hass: HomeAssistant
): Promise<SupervisorStore> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    return hass.callWS({
      type: "supervisor/api",
      endpoint: "/store",
      method: "get",
    });
  }

  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<SupervisorStore>>("GET", `hassio/store`)
  );
};
