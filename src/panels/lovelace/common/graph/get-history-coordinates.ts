import { fetchRecent } from "../../../../data/history";
import { coordinates } from "../graph/coordinates";
import { HomeAssistant } from "../../../../types";

export const getHistoryCoordinates = async (
  hass: HomeAssistant,
  entity: string,
  hours: number,
  detail: number
) => {
  const endTime = new Date();
  const startTime = new Date();
  startTime.setHours(endTime.getHours() - hours);

  const stateHistory = await fetchRecent(hass, entity, startTime, endTime);

  if (stateHistory.length < 1 || stateHistory[0].length < 1) {
    return;
  }

  const coords = coordinates(stateHistory[0], hours, 500, detail);

  return coords;
};
