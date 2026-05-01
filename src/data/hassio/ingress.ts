import { getCollection, type Connection } from "home-assistant-js-websocket";
import { atLeastVersion } from "../../common/config/version";
import type { HomeAssistant } from "../../types";
import { supervisorApiWsRequest } from "../supervisor/supervisor";
import type { HassioResponse } from "./common";
import type { CreateSessionResponse } from "./supervisor";

function setIngressCookie(session: string): string {
  document.cookie = `ingress_session=${session};path=/api/hassio_ingress/;SameSite=Strict${
    location.protocol === "https:" ? ";Secure" : ""
  }`;
  return session;
}

export const createHassioSession = async (
  hass: HomeAssistant
): Promise<string> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    const wsResponse: { session: string } = await hass.callWS({
      type: "supervisor/api",
      endpoint: "/ingress/session",
      method: "post",
    });
    return setIngressCookie(wsResponse.session);
  }

  const restResponse: { data: { session: string } } = await hass.callApi<
    HassioResponse<CreateSessionResponse>
  >("POST", "hassio/ingress/session");
  return setIngressCookie(restResponse.data.session);
};

export interface IngressPanelInfo {
  title: string;
  icon: string;
}

export type IngressPanelInfoMap = Record<string, IngressPanelInfo>;

export const getIngressPanelInfoCollection = (conn: Connection) =>
  getCollection<IngressPanelInfoMap>(
    conn,
    "_ingressPanelInfo",
    async (conn2) => {
      const result = await supervisorApiWsRequest<{
        panels: IngressPanelInfoMap;
      }>(conn2, { endpoint: "/ingress/panels" });
      return result.panels;
    }
  );

export const validateHassioSession = async (
  hass: HomeAssistant,
  session: string
): Promise<void> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: "/ingress/validate_session",
      method: "post",
      data: { session },
    });
    return;
  }

  await hass.callApi<HassioResponse<void>>(
    "POST",
    "hassio/ingress/validate_session",
    { session }
  );
};
