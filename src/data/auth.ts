import { HomeAssistant } from "../types";

export interface AuthProvider {
  name: string;
  id: string;
  type: string;
}

export interface Credential {
  type: string;
}

export interface SignedPath {
  path: string;
}

export const hassUrl = `${location.protocol}//${location.host}`;

export const getSignedPath = (
  hass: HomeAssistant,
  path: string
): Promise<SignedPath> => hass.callWS({ type: "auth/sign_path", path });

export const fetchAuthProviders = () =>
  fetch("/auth/providers", {
    credentials: "same-origin",
  });
