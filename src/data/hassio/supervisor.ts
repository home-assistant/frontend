import { HomeAssistant, PanelInfo } from "../../types";
import { HassioResponse, hassioApiResultExtractor } from "./common";

export type HassioHomeAssistantInfo = any;
export type HassioSupervisorInfo = any;

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
  channel: "beta" | "dev" | "stable";
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

export const fetchSupervisorLogs = async (hass: HomeAssistant) => {
  return hass.callApi<string>("GET", "hassio/supervisor/logs");
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
