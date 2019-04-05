import { HomeAssistant } from "../types";

interface HassioResponse<T> {
  data: T;
  result: "ok";
}

interface CreateSessionResponse {
  session: string;
}

export const createHassioSession = async (hass: HomeAssistant) => {
  const response = await hass.callApi<HassioResponse<CreateSessionResponse>>(
    "POST",
    "hassio/ingress/session"
  );
  console.log(
    `ingress_session=${response.data.session};path=/api/hassio_ingress/`
  );
  document.cookie = `ingress_session=${
    response.data.session
  };path=/api/hassio_ingress/`;
};
