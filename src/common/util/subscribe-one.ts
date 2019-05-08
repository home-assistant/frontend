import { HomeAssistant } from "../../types";
import { UnsubscribeFunc } from "home-assistant-js-websocket";

export const subscribeOne = async <T>(
  hass: HomeAssistant,
  subscribe: (
    hass: HomeAssistant,
    onChange: (items: T) => void
  ) => UnsubscribeFunc
) =>
  new Promise<T>((resolve) => {
    const unsub = subscribe(hass, (items) => {
      unsub();
      resolve(items);
    });
  });
