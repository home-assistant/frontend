import { HomeAssistant } from "../../types";
import { hassioApiResultExtractor, HassioResponse } from "./common";

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
  if (hass) {
    return hassioApiResultExtractor(
      await hass.callApi<HassioResponse<HassioSnapshotDetail>>(
        "GET",
        `hassio/snapshots/${snapshot}/info`
      )
    );
  }
  // When called from onboarding we don't have hass
  const resp = await fetch(`/api/hassio/snapshots/${snapshot}/info`, {
    method: "GET",
  });
  const data = (await resp.json()).data;
  return data;
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

export const uploadSnapshot = async (
  hass: HomeAssistant,
  file: File
): Promise<HassioResponse<HassioSnapshot>> => {
  const fd = new FormData();
  let resp;
  fd.append("file", file);
  if (hass) {
    resp = await hass.fetchWithAuth("/api/hassio/snapshots/new/upload", {
      method: "POST",
      body: fd,
    });
  } else {
    // When called from onboarding we don't have hass
    resp = await fetch("/api/hassio/snapshots/new/upload", {
      method: "POST",
      body: fd,
    });
  }

  if (resp.status === 413) {
    throw new Error("Uploaded snapshot is too large");
  } else if (resp.status !== 200) {
    throw new Error(`${resp.status} ${resp.statusText}`);
  }
  return await resp.json();
};
