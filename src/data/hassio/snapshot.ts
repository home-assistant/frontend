import { atLeastVersion } from "../../common/config/version";
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

export const fetchHassioSnapshots = async (
  hass: HomeAssistant
): Promise<HassioSnapshot[]> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    const data: { snapshots: HassioSnapshot[] } = await hass.callWS({
      type: "supervisor/api",
      endpoint: `/snapshots`,
      method: "get",
    });
    return data.snapshots;
  }

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
): Promise<HassioSnapshotDetail> => {
  if (hass) {
    if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
      return await hass.callWS({
        type: "supervisor/api",
        endpoint: `/snapshots/${snapshot}/info`,
        method: "get",
      });
    }
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
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: "/snapshots/reload",
      method: "post",
    });
    return;
  }

  await hass.callApi<HassioResponse<void>>("POST", `hassio/snapshots/reload`);
};

export const createHassioFullSnapshot = async (
  hass: HomeAssistant,
  data: HassioFullSnapshotCreateParams
) => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: "/snapshots/new/full",
      method: "post",
      timeout: null,
    });
    return;
  }
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
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: "/snapshots/new/partial",
      method: "post",
      timeout: null,
      data,
    });
    return;
  }

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
