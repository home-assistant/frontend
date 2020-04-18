import { fetchRecent } from "../../../../data/history";
import { HomeAssistant } from "../../../../types";
import { coordinates } from "./coordinates";

export const getHistoryCoordinates = async (
  hass: HomeAssistant,
  entity: string,
  hours: number,
  detail: number
): Promise<number[][]> => {
  const endTime = new Date();
  const startTime = new Date();
  startTime.setHours(endTime.getHours() - hours);

  const stateHistory = await fetchRecent(hass, entity, startTime, endTime);

  if (stateHistory.length < 1 || stateHistory[0].length < 1) {
    return [];
  }

  const coords = coordinates(stateHistory[0], hours, 500, detail);

  if (!coords) {
    return [];
  }

  return coords;
};
