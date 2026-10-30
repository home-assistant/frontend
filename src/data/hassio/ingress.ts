import { getCollection, type Connection } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../../types";
import type { AddonState } from "./addon";
import { supervisorApiWsRequest } from "../supervisor/supervisor";

function setIngressCookie(session: string): string {
  document.cookie = `ingress_session=${session};path=/api/hassio_ingress/;SameSite=Strict${
    location.protocol === "https:" ? ";Secure" : ""
  }`;
  return session;
}

export interface IngressAppInfo {
  name: string;
  slug: string;
  version: string | null;
  state: AddonState | null;
  ingress_url: string | null;
}

export const fetchIngressAppInfo = (
  hass: Pick<HomeAssistant, "callWS">,
  slug: string
): Promise<IngressAppInfo> =>
  hass.callWS({ type: "supervisor/ingress/info", slug });

export const createHassioSession = async (
  hass: Pick<HomeAssistant, "callWS">,
  slug: string
): Promise<string> => {
  const wsResponse: { session: string } = await hass.callWS({
    type: "supervisor/ingress/session",
    slug,
  });
  return setIngressCookie(wsResponse.session);
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
  hass: Pick<HomeAssistant, "callWS">,
  session: string
): Promise<void> => {
  await hass.callWS({ type: "supervisor/ingress/validate_session", session });
};
