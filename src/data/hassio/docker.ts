import { HomeAssistant } from "../../types";
import { hassioApiResultExtractor, HassioResponse } from "./common";

interface HassioDockerRegistries {
  [key: string]: { username: string; password?: string };
}

export const fetchHassioDockerRegistries = async (hass: HomeAssistant) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioDockerRegistries>>(
      "GET",
      "hassio/docker/registries"
    )
  );
};

export const addHassioDockerRegistry = async (
  hass: HomeAssistant,
  data: HassioDockerRegistries
) => {
  await hass.callApi<HassioResponse<HassioDockerRegistries>>(
    "POST",
    "hassio/docker/registries",
    data
  );
};

export const removeHassioDockerRegistry = async (
  hass: HomeAssistant,
  registry: string
) => {
  await hass.callApi<HassioResponse<void>>(
    "DELETE",
    `hassio/docker/registries/${registry}`
  );
};
