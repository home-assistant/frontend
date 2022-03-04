import { HomeAssistant } from "../types";

export interface UpdateDescription {
  identifier: string;
  name: string;
  domain: string;
  current_version: string;
  available_version: string;
  changelog_content: string | null;
  changelog_url: string | null;
  icon_url: string | null;
  supports_backup: boolean;
}

export interface SkipUpdateParams {
  domain: string;
  version: string;
  identifier: string;
}

export interface PerformUpdateParams extends SkipUpdateParams {
  backup?: boolean;
}

export const fetchUpdateInfo = (
  hass: HomeAssistant
): Promise<UpdateDescription[]> => hass.callWS({ type: "update/info" });

export const skipUpdate = (
  hass: HomeAssistant,
  params: SkipUpdateParams
): Promise<void> => hass.callWS({ type: "update/skip", ...params });

export const performUpdate = (
  hass: HomeAssistant,
  params: PerformUpdateParams
): Promise<void> => hass.callWS({ type: "update/update", ...params });
