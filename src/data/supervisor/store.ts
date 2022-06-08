import { HomeAssistant } from "../../types";
import { AddonRepository, AddonStage } from "../hassio/addon";
import { supervisorApiCall } from "./common";

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
): Promise<SupervisorStore> => supervisorApiCall(hass, "/store");

export const fetchStoreRepositories = async (
  hass: HomeAssistant
): Promise<StoreRepository[]> => supervisorApiCall(hass, "/store/repositories");

export const addStoreRepository = async (
  hass: HomeAssistant,
  repository: string
): Promise<void> =>
  supervisorApiCall(hass, "/store/repositories", {
    method: "post",
    data: { repository },
  });

export const removeStoreRepository = async (
  hass: HomeAssistant,
  repository: string
): Promise<void> =>
  supervisorApiCall(hass, `/store/repositories/${repository}`, {
    method: "delete",
  });
