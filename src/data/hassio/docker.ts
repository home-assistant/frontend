import { atLeastVersion } from "../../common/config/version";
import { HomeAssistant } from "../../types";
import { hassioApiResultExtractor, HassioResponse } from "./common";

interface HassioDockerRegistries {
  [key: string]: { username: string; password?: string };
}

export const fetchHassioDockerRegistries = async (
  hass: HomeAssistant
): Promise<HassioDockerRegistries> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    return hass.callWS({
      type: "supervisor/api",
      endpoint: `/docker/registries`,
      method: "get",
    });
  }

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
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: `/docker/registries`,
      method: "post",
      data,
    });
    return;
  }

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
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: `/docker/registries/${registry}`,
      method: "delete",
    });
    return;
  }

  await hass.callApi<HassioResponse<void>>(
    "DELETE",
    `hassio/docker/registries/${registry}`
  );
};
