import { ExternalMessaging } from "./external_messaging";

export interface ExternalConfig {
  sidebarSettings: boolean;
}

export const getExternalConfig = (
  bus: ExternalMessaging
): Promise<ExternalConfig> => {
  if (!bus.cache.cfg) {
    bus.cache.cfg = bus.sendMessage<ExternalConfig>({
      type: "config/get",
    });
  }
  return bus.cache.cfg;
};
