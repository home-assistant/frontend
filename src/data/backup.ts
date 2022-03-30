import { HomeAssistant } from "../types";

export interface BackupContent {
  slug: string;
  date: string;
  name: string;
  size: number;
  path: string;
}

export interface BackupData {
  backing_up: boolean;
  backups: BackupContent[];
}

export const getBackupDownloadUrl = (slug: string) =>
  `/api/backup/download/${slug}`;

export const fetchBackupInfo = (hass: HomeAssistant): Promise<BackupData> =>
  hass.callWS({
    type: "backup/info",
  });

export const removeBackup = (
  hass: HomeAssistant,
  slug: string
): Promise<void> =>
  hass.callWS({
    type: "backup/remove",
    slug,
  });

export const generateBackup = (hass: HomeAssistant): Promise<BackupContent> =>
  hass.callWS({
    type: "backup/generate",
  });
