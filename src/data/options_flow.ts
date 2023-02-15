import { HomeAssistant } from "../types";
import { DataEntryFlowStep } from "./data_entry_flow";

export const createOptionsFlow = (hass: HomeAssistant, handler: string) =>
  hass.callApi<DataEntryFlowStep>(
    "POST",
    "config/config_entries/options/flow",
    {
      handler,
      show_advanced_options: Boolean(hass.userData?.showAdvanced),
    }
  );

export const fetchOptionsFlow = (hass: HomeAssistant, flowId: string) =>
  hass.callApi<DataEntryFlowStep>(
    "GET",
    `config/config_entries/options/flow/${flowId}`
  );

export const handleOptionsFlowStep = (
  hass: HomeAssistant,
  flowId: string,
  data: Record<string, any>
) =>
  hass.callApi<DataEntryFlowStep>(
    "POST",
    `config/config_entries/options/flow/${flowId}`,
    transformEmptiedFields(data)
  );

/**
 * If a field is undefined it was emptied by the user.
 *
 * Set those to null so they won't be overridden by voluptuous defaults in core
 * @param data Data which is intended to be send as the OptionFlow payload
 * @returns the same data where undefined fields are null instead
 */
function transformEmptiedFields<T>(
  data: Record<string, T>
): Record<string, T | null> {
  // If a field is undefined it was emptied by the user
  // Set it to null so it won't be overridden by voluptuous defaults in core
  const toSendData: Record<string, T | null> = {};

  for (const [key, value] of Object.entries(data)) {
    toSendData[key] = value !== undefined ? value : null;
  }

  return toSendData;
}

export const deleteOptionsFlow = (hass: HomeAssistant, flowId: string) =>
  hass.callApi("DELETE", `config/config_entries/options/flow/${flowId}`);
