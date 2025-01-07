import type { HomeAssistant } from "../types";
import type { DataEntryFlowStep } from "./data_entry_flow";

const HEADERS = {
  "HA-Frontend-Base": `${location.protocol}//${location.host}`,
};

export const createSubConfigFlow = (
  hass: HomeAssistant,
  configEntryId: string,
  subFlowType: string,
  subentry_id?: string
) =>
  hass.callApi<DataEntryFlowStep>(
    "POST",
    "config/config_entries/subentries/flow",
    {
      handler: [configEntryId, subFlowType],
      show_advanced_options: Boolean(hass.userData?.showAdvanced),
      subentry_id,
    },
    HEADERS
  );

export const fetchSubConfigFlow = (hass: HomeAssistant, flowId: string) =>
  hass.callApi<DataEntryFlowStep>(
    "GET",
    `config/config_entries/subentries/flow/${flowId}`,
    undefined,
    HEADERS
  );

export const handleSubConfigFlowStep = (
  hass: HomeAssistant,
  flowId: string,
  data: Record<string, any>
) =>
  hass.callApi<DataEntryFlowStep>(
    "POST",
    `config/config_entries/subentries/flow/${flowId}`,
    data,
    HEADERS
  );

export const deleteSubConfigFlow = (hass: HomeAssistant, flowId: string) =>
  hass.callApi("DELETE", `config/config_entries/subentries/flow/${flowId}`);
