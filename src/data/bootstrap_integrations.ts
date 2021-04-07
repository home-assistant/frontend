import { HomeAssistant } from "../types";

type BootstrapIntegrationsTiming = { [key: string]: number };

export const subscribeBootstrapIntegrations = (
  hass: HomeAssistant,
  callback: (message: BootstrapIntegrationsTiming) => void
) => {
  const unsubProm = hass.connection.subscribeMessage<
    BootstrapIntegrationsTiming
  >((message) => callback(message), {
    type: "subscribe_bootstrap_integrations",
  });

  return unsubProm;
};
