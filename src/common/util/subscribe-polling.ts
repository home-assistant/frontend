import { HomeAssistant } from "../../types";

export const subscribePollingCollection = (
  hass: HomeAssistant,
  updateData: (hass: HomeAssistant) => void,
  interval: number
) => {
  let timeout;
  const fetchData = async () => {
    try {
      await updateData(hass);
    } finally {
      timeout = setTimeout(() => fetchData(), interval);
    }
  };
  fetchData();
  return () => clearTimeout(timeout);
};
