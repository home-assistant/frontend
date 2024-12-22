import { HaFormSchema } from "../components/ha-form/types";
import { HomeAssistant } from "../types";
import { RefreshTokenType } from "./refresh_token";

export interface AuthUrlSearchParams {
  client_id?: string;
  redirect_uri?: string;
  state?: string;
}

export interface AuthProvider {
  name: string;
  id: string;
  type: string;
  users?: Record<string, string>;
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

export const createLoginFlow = (
  client_id: string | undefined,
  redirect_uri: string | undefined,
  handler: (string | null)[]
) =>
  fetch("/auth/login_flow", {
    method: "POST",
    credentials: "same-origin",
    body: JSON.stringify({
      client_id,
      handler,
      redirect_uri,
    }),
  });

export const submitLoginFlow = (flow_id: string, data: Record<string, any>) =>
  fetch(`/auth/login_flow/${flow_id}`, {
    method: "POST",
    credentials: "same-origin",
    body: JSON.stringify(data),
  });

export const deleteLoginFlow = (flow_id) =>
  fetch(`/auth/login_flow/${flow_id}`, {
    method: "DELETE",
    credentials: "same-origin",
  });

export const redirectWithAuthCode = (
  url: string,
  authCode: string,
  oauth2State: string | undefined,
  storeToken: boolean
) => {
  // OAuth 2: 3.1.2 we need to retain query component of a redirect URI
  if (!url.includes("?")) {
    url += "?";
  } else if (!url.endsWith("&")) {
    url += "&";
  }

  url += `code=${encodeURIComponent(authCode)}`;

  if (oauth2State) {
    url += `&state=${encodeURIComponent(oauth2State)}`;
  }
  if (storeToken) {
    url += `&storeToken=true`;
  }

  document.location.assign(url);
};

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

export const changePassword = (
  hass: HomeAssistant,
  current_password: string,
  new_password: string
) =>
  hass.callWS({
    type: "config/auth_provider/homeassistant/change_password",
    current_password,
    new_password,
  });

export const adminChangePassword = (
  hass: HomeAssistant,
  userId: string,
  password: string
) =>
  hass.callWS<void>({
    type: "config/auth_provider/homeassistant/admin_change_password",
    user_id: userId,
    password,
  });

export const deleteAllRefreshTokens = (
  hass: HomeAssistant,
  token_type?: RefreshTokenType,
  delete_current_token?: boolean
) =>
  hass.callWS({
    type: "auth/delete_all_refresh_tokens",
    token_type,
    delete_current_token,
  });
