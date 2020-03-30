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

export const createAuthForUser = async (
  hass: HomeAssistant,
  userId: string,
  username: string,
  password: string
) =>
  hass.callWS({
    type: "config/auth_provider/homeassistant/create",
    user_id: userId,
    username,
    password,
  });
