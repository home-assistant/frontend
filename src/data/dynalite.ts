import { HomeAssistant } from "../types";

export interface GetEntryData {
  data: any;
}

export const getEntry = (
  hass: HomeAssistant,
  configEntryId: string
): Promise<GetEntryData> =>
  hass.callWS({
    type: "dynalite/get_entry",
    entry_id: configEntryId,
  });

export const updateEntry = (
  hass: HomeAssistant,
  configEntryId: string,
  entryData: any
): Promise<void> =>
  hass.callWS({
    type: "dynalite/update_entry",
    entry_id: configEntryId,
    entry_data: entryData,
  });
