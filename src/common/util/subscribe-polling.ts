import type { HomeAssistant } from "../../types";

export const subscribePollingCollection = (
  hass: HomeAssistant,
  updateData: (hass: HomeAssistant) => void,
  interval: number
) => {
  let timeout: number | undefined;
  let cancelled = false;
  const fetchData = async () => {
    try {
      await updateData(hass);
    } finally {
      if (!cancelled) {
        timeout = window.setTimeout(() => fetchData(), interval);
      }
    }
  };
  fetchData();
  return () => {
    cancelled = true;
    clearTimeout(timeout);
  };
};
