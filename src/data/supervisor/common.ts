import type { HomeAssistant } from "../../types";

export interface SupervisorApiCallOptions {
  method?: "get" | "post" | "delete";
  data?: Record<string, any>;
  timeout?: number;
}

export const supervisorApiCall = async <T>(
  hass: HomeAssistant,
  endpoint: string,
  options?: SupervisorApiCallOptions
): Promise<T> =>
  hass.callWS<T>({
    type: "supervisor/api",
    endpoint,
    method: options?.method || "get",
    timeout: options?.timeout ?? null,
    data: options?.data,
  });
