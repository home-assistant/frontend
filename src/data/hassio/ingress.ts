import { HomeAssistant } from "../../types";
import { HassioResponse } from "./common";
import { CreateSessionResponse } from "./supervisor";

export const createHassioSession = async (hass: HomeAssistant) => {
  const response = await hass.callApi<HassioResponse<CreateSessionResponse>>(
    "POST",
    "hassio/ingress/session"
  );
  document.cookie = `ingress_session=${
    response.data.session
  };path=/api/hassio_ingress/;SameSite=Strict${
    location.protocol === "https:" ? ";Secure" : ""
  }`;
  return response.data.session;
};

export const validateHassioSession = async (
  hass: HomeAssistant,
  session: string
) =>
  await hass.callApi<HassioResponse<null>>(
    "POST",
    "hassio/ingress/validate_session",
    { session }
  );
