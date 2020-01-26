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

export const fetchHassioHomeAssistantInfo = (hass: HomeAssistant) =>
  hass
    .callApi<HassioResponse<HassioHomeAssistantInfo>>(
      "GET",
      "hassio/homeassistant/info"
    )
    .then(hassioApiResultExtractor);

export const fetchHassioSupervisorInfo = (hass: HomeAssistant) =>
  hass
    .callApi<HassioResponse<HassioSupervisorInfo>>(
      "GET",
      "hassio/supervisor/info"
    )
    .then(hassioApiResultExtractor);

export const createHassioSession = async (hass: HomeAssistant) => {
  const response = await hass.callApi<HassioResponse<CreateSessionResponse>>(
    "POST",
    "hassio/ingress/session"
  );
  document.cookie = `ingress_session=${response.data.session};path=/api/hassio_ingress/`;
};
