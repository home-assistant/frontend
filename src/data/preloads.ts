import type { LovelaceRawConfig } from "./lovelace/config/types";
import type { LovelaceResource } from "./lovelace/resource";
import type { RecorderInfo } from "./recorder";

export interface WindowWithPreloads extends Window {
  llConfProm?: Promise<LovelaceRawConfig>;
  llConfUrlPath?: string;
  llResProm?: Promise<LovelaceResource[]>;
  recorderInfoProm?: Promise<RecorderInfo>;
}

export const getPreloadDashboardUrlPath = (
  pathname: string
): string | undefined => {
  const urlPath = pathname.split("/")[1];
  return urlPath === "lovelace" || urlPath?.includes("-") ? urlPath : undefined;
};
