import { HomeAssistant, PanelInfo } from "../../types";
import { hassioApiResultExtractor, HassioResponse } from "./common";

export type HassioHomeAssistantInfo = any;
export type HassioSupervisorInfo = any;

export type HassioInfo = {
  arch: string;
  channel: string;
  docker: string;
  hassos?: string;
  homeassistant: string;
  hostname: string;
  logging: string;
  maching: string;
  supervisor: string;
  supported_arch: string[];
  timezone: string;
};

export type HassioPanelInfo = PanelInfo<
  | undefined
  | {
      ingress?: string;
    }
>;

export interface CreateSessionResponse {
  session: string;
}

export interface SupervisorOptions {
  channel?: "beta" | "dev" | "stable";
  addons_repositories?: string[];
}

export const fetchHassioHomeAssistantInfo = async (hass: HomeAssistant) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioHomeAssistantInfo>>(
      "GET",
      "hassio/core/info"
    )
  );
};

export const fetchHassioSupervisorInfo = async (hass: HomeAssistant) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioSupervisorInfo>>(
      "GET",
      "hassio/supervisor/info"
    )
  );
};

export const fetchHassioInfo = async (hass: HomeAssistant) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioInfo>>("GET", "hassio/info")
  );
};

export const fetchHassioLogs = async (
  hass: HomeAssistant,
  provider: string
) => {
  return hass.callApi<string>("GET", `hassio/${provider}/logs`);
};

export const createHassioSession = async (hass: HomeAssistant) => {
  const response = await hass.callApi<HassioResponse<CreateSessionResponse>>(
    "POST",
    "hassio/ingress/session"
  );
  document.cookie = `ingress_session=${response.data.session};path=/api/hassio_ingress/`;
};

export const setSupervisorOption = async (
  hass: HomeAssistant,
  data: SupervisorOptions
) => {
  await hass.callApi<HassioResponse<void>>(
    "POST",
    "hassio/supervisor/options",
    data
  );
};
