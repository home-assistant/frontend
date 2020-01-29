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

export const fetchHassioSnapshots = async (hass: HomeAssistant) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<{ snapshots: HassioSnapshot[] }>>(
      "GET",
      "hassio/snapshots"
    )
  ).snapshots;
};

export const fetchHassioSnapshotInfo = async (
  hass: HomeAssistant,
  snapshot: string
) => {
  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<HassioSnapshotDetail>>(
      "GET",
      `hassio/snapshots/${snapshot}/info`
    )
  );
};

export const reloadHassioSnapshots = async (hass: HomeAssistant) => {
  await hass.callApi<HassioResponse<void>>("POST", `hassio/snapshots/reload`);
};

export const createHassioFullSnapshot = async (
  hass: HomeAssistant,
  data: HassioFullSnapshotCreateParams
) => {
  await hass.callApi<HassioResponse<void>>(
    "POST",
    `hassio/snapshots/new/full`,
    data
  );
};

export const createHassioPartialSnapshot = async (
  hass: HomeAssistant,
  data: HassioFullSnapshotCreateParams
) => {
  await hass.callApi<HassioResponse<void>>(
    "POST",
    `hassio/snapshots/new/partial`,
    data
  );
};
