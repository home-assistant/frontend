import { HaFormSchema } from "../components/ha-form/types";
import { HomeAssistant } from "../types";

export interface AuthUrlSearchParams {
  client_id?: string;
  redirect_uri?: string;
  state?: string;
}

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

export const autocompleteLoginFields = (schema: HaFormSchema[]) =>
  schema.map((field) => {
    if (field.type !== "string") return field;
    switch (field.name) {
      case "username":
        return { ...field, autocomplete: "username" };
      case "password":
        return { ...field, autocomplete: "current-password" };
      case "code":
        return { ...field, autocomplete: "one-time-code" };
      default:
        return field;
    }
  });

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

export const adminChangePassword = async (
  hass: HomeAssistant,
  userId: string,
  password: string
) =>
  hass.callWS<void>({
    type: "config/auth_provider/homeassistant/admin_change_password",
    user_id: userId,
    password,
  });
