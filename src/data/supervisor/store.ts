import type { HomeAssistant } from "../../types";
import type { AddonAppArmour, AddonRole, AddonStage } from "../hassio/addon";
import { supervisorApiCall } from "./common";
import type { SupervisorArch } from "./supervisor";

export interface StoreAddon {
  advanced: boolean;
  arch: SupervisorArch[];
  available: boolean;
  build: boolean;
  description: string;
  documentation: boolean;
  homeassistant: string | null;
  icon: boolean;
  installed: boolean;
  logo: boolean;
  name: string;
  repository: string;
  slug: string;
  stage: AddonStage;
  update_available: boolean;
  url: string | null;
  version_latest: string;
  // The Supervisor reports the installed version here, but the frontend only
  // ever loads store details for add-ons that are not installed. Kept as `null`
  // so it discriminates `StoreAddon` from `HassioAddonInfo`.
  version: null;
}

export interface StoreAddonDetails extends StoreAddon {
  apparmor: AddonAppArmour;
  auth_api: boolean;
  detached: boolean;
  docker_api: boolean;
  full_access: boolean;
  hassio_api: boolean;
  hassio_role: AddonRole;
  homeassistant_api: boolean;
  host_network: boolean;
  host_pid: boolean;
  ingress: boolean;
  long_description: string | null;
  rating: number;
  signed: boolean;
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
