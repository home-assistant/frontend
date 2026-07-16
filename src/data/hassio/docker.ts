import type { HomeAssistant } from "../../types";

type HassioDockerRegistries = Record<
  string,
  { username: string; password?: string }
>;

export const fetchHassioDockerRegistries = async (
  hass: HomeAssistant
): Promise<HassioDockerRegistries> =>
  hass.callWS({
    type: "supervisor/api",
    endpoint: `/docker/registries`,
    method: "get",
  });

export const addHassioDockerRegistry = async (
  hass: HomeAssistant,
  data: HassioDockerRegistries
) => {
  await hass.callWS({
    type: "supervisor/api",
    endpoint: `/docker/registries`,
    method: "post",
    data,
  });
};

export const removeHassioDockerRegistry = async (
  hass: HomeAssistant,
  registry: string
) => {
  await hass.callWS({
    type: "supervisor/api",
    endpoint: `/docker/registries/${registry}`,
    method: "delete",
  });
};
