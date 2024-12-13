import { atLeastVersion } from "../../common/config/version";
import type { HomeAssistant } from "../../types";
import type { HassioResponse } from "../hassio/common";
import { hassioApiResultExtractor } from "../hassio/common";

export interface SupervisorApiCallOptions {
  method?: "get" | "post" | "delete";
  data?: Record<string, any>;
  timeout?: number;
}

export const supervisorApiCall = async <T>(
  hass: HomeAssistant,
  endpoint: string,
  options?: SupervisorApiCallOptions
): Promise<T> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    // Websockets was added in 2021.2.4
    return hass.callWS<T>({
      type: "supervisor/api",
      endpoint,
      method: options?.method || "get",
      timeout: options?.timeout ?? null,
      data: options?.data,
    });
  }
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<T>>(
      // @ts-ignore
      (options.method || "get").toUpperCase(),
      `hassio${endpoint}`,
      options?.data
    )
  );
};
