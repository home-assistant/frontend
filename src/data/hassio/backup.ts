import { atLeastVersion } from "../../common/config/version";
import { HomeAssistant } from "../../types";
import { hassioApiResultExtractor, HassioResponse } from "./common";

export const friendlyFolderName = {
  ssl: "SSL",
  homeassistant: "Configuration",
  "addons/local": "Local add-ons",
  media: "Media",
  share: "Share",
};

interface BackupContent {
  homeassistant: boolean;
  folders: string[];
  addons: string[];
}

export interface HassioBackup {
  slug: string;
  date: string;
  name: string;
  size: number;
  type: "full" | "partial";
  protected: boolean;
  location: string | null;
  content: BackupContent;
}

export interface HassioBackupDetail extends HassioBackup {
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

export interface HassioFullBackupCreateParams {
  name: string;
  password?: string;
  confirm_password?: string;
}
export interface HassioPartialBackupCreateParams
  extends HassioFullBackupCreateParams {
  folders?: string[];
  addons?: string[];
  homeassistant?: boolean;
}

export const fetchHassioBackups = async (
  hass: HomeAssistant
): Promise<HassioBackup[]> => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    const data: {
      [key: string]: HassioBackup[];
    } = await hass.callWS({
      type: "supervisor/api",
      endpoint: `/${
        atLeastVersion(hass.config.version, 2021, 9) ? "backups" : "snapshots"
      }`,
      method: "get",
    });
    return data[
      atLeastVersion(hass.config.version, 2021, 9) ? "backups" : "snapshots"
    ];
  }

  return hassioApiResultExtractor(
    await hass.callApi<HassioResponse<{ snapshots: HassioBackup[] }>>(
      "GET",
      `hassio/${
        atLeastVersion(hass.config.version, 2021, 9) ? "backups" : "snapshots"
      }`
    )
  ).snapshots;
};

export const fetchHassioBackupInfo = async (
  hass: HomeAssistant | undefined,
  backup: string
): Promise<HassioBackupDetail> => {
  if (hass) {
    if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
      return hass.callWS({
        type: "supervisor/api",
        endpoint: `/${
          atLeastVersion(hass.config.version, 2021, 9) ? "backups" : "snapshots"
        }/${backup}/info`,
        method: "get",
      });
    }
    return hassioApiResultExtractor(
      await hass.callApi<HassioResponse<HassioBackupDetail>>(
        "GET",
        `hassio/${
          atLeastVersion(hass.config.version, 2021, 9) ? "backups" : "snapshots"
        }/${backup}/info`
      )
    );
  }
  // When called from onboarding we don't have hass
  const resp = await fetch(`/api/hassio/backups/${backup}/info`, {
    method: "GET",
  });
  const data = (await resp.json()).data;
  return data;
};

export const reloadHassioBackups = async (hass: HomeAssistant) => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: `/${
        atLeastVersion(hass.config.version, 2021, 9) ? "backups" : "snapshots"
      }/reload`,
      method: "post",
    });
    return;
  }

  await hass.callApi<HassioResponse<void>>(
    "POST",
    `hassio/${
      atLeastVersion(hass.config.version, 2021, 9) ? "backups" : "snapshots"
    }/reload`
  );
};

export const createHassioFullBackup = async (
  hass: HomeAssistant,
  data: HassioFullBackupCreateParams
) => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: `/${
        atLeastVersion(hass.config.version, 2021, 9) ? "backups" : "snapshots"
      }/new/full`,
      method: "post",
      timeout: null,
      data,
    });
    return;
  }
  await hass.callApi<HassioResponse<void>>(
    "POST",
    `hassio/${
      atLeastVersion(hass.config.version, 2021, 9) ? "backups" : "snapshots"
    }/new/full`,
    data
  );
};

export const removeBackup = async (hass: HomeAssistant, slug: string) => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: `/${
        atLeastVersion(hass.config.version, 2021, 9)
          ? `backups/${slug}`
          : `snapshots/${slug}/remove`
      }`,
      method: atLeastVersion(hass.config.version, 2021, 9) ? "delete" : "post",
    });
    return;
  }
  await hass.callApi<HassioResponse<void>>(
    "POST",
    `hassio/${
      atLeastVersion(hass.config.version, 2021, 9) ? "backups" : "snapshots"
    }/${slug}/remove`
  );
};

export const createHassioPartialBackup = async (
  hass: HomeAssistant,
  data: HassioPartialBackupCreateParams
) => {
  if (atLeastVersion(hass.config.version, 2021, 2, 4)) {
    await hass.callWS({
      type: "supervisor/api",
      endpoint: `/${
        atLeastVersion(hass.config.version, 2021, 9) ? "backups" : "snapshots"
      }/new/partial`,
      method: "post",
      timeout: null,
      data,
    });
    return;
  }

  await hass.callApi<HassioResponse<void>>(
    "POST",
    `hassio/${
      atLeastVersion(hass.config.version, 2021, 9) ? "backups" : "snapshots"
    }/new/partial`,
    data
  );
};

export const uploadBackup = async (
  hass: HomeAssistant | undefined,
  file: File
): Promise<HassioResponse<HassioBackup>> => {
  const fd = new FormData();
  let resp;
  fd.append("file", file);
  if (hass) {
    resp = await hass.fetchWithAuth(
      `/api/hassio/${
        atLeastVersion(hass.config.version, 2021, 9) ? "backups" : "snapshots"
      }/new/upload`,
      {
        method: "POST",
        body: fd,
      }
    );
  } else {
    // When called from onboarding we don't have hass
    resp = await fetch("/api/hassio/backups/new/upload", {
      method: "POST",
      body: fd,
    });
  }

  if (resp.status === 413) {
    throw new Error("Uploaded backup is too large");
  } else if (resp.status !== 200) {
    throw new Error(`${resp.status} ${resp.statusText}`);
  }
  return resp.json();
};
