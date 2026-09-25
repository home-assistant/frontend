import type { HomeAssistant } from "../types";

export type BootstrapIntegrationsTimings = Record<string, number>;

export const subscribeBootstrapIntegrations = (
  hass: HomeAssistant,
  callback: (message: BootstrapIntegrationsTimings) => void
) => {
  const unsubProm =
    hass.connection.subscribeMessage<BootstrapIntegrationsTimings>(
      (message) => callback(message),
      {
        type: "subscribe_bootstrap_integrations",
      }
    );

  return unsubProm;
};
