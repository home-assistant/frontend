import { HomeAssistant } from "../../types";
import { HassioResponse, hassioApiResultExtractor } from "./common";

export interface HassioSnapshot {
  slug: string;
  date: string;
  name: string;
  type: "full" | "partial";
  protected: boolean;
}

export interface HassioSnapshotDetail extends HassioSnapshot {
  size: number;
  homeassistant: string;
  addons: Array<{
    slug: "ADDON_SLUG";
    name: "NAME";
    version: "INSTALLED_VERSION";
    size: "SIZE_IN_MB";
  }>;
  repositories: string[];
  folders: string[];
}

export interface HassioFullSnapshotCreateParams {
  name: string;
  password?: string;
}
export interface HassioPartialSnapshotCreateParams {
  name: string;
  folders: string[];
  addons: string[];
  password?: string;
}

export const fetchHassioSnapshots = (hass: HomeAssistant) =>
  hass
    .callApi<HassioResponse<{ snapshots: HassioSnapshot[] }>>(
      "GET",
      "hassio/snapshots"
    )
    .then((resp) => resp.data.snapshots);

export const reloadHassioSnapshots = (hass: HomeAssistant) =>
  hass.callApi<unknown>("POST", `hassio/snapshots/reload`);

export const createHassioFullSnapshot = (
  hass: HomeAssistant,
  data: HassioFullSnapshotCreateParams
) => hass.callApi<unknown>("POST", "hassio/snapshots/new/full", data);

export const createHassioPartialSnapshot = (
  hass: HomeAssistant,
  data: HassioPartialSnapshotCreateParams
) => hass.callApi<unknown>("POST", "hassio/snapshots/new/partial", data);

export const fetchHassioSnapshotInfo = (
  hass: HomeAssistant,
  snapshot: string
) =>
  hass
    .callApi<HassioResponse<HassioSnapshotDetail>>(
      "GET",
      `hassio/snapshots/${snapshot}/info`
    )
    .then(hassioApiResultExtractor);
