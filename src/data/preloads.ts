import type { LovelaceRawConfig } from "./lovelace/config/types";
import type { LovelaceResource } from "./lovelace/resource";
import type { RecorderInfo } from "./recorder";

export interface WindowWithPreloads extends Window {
  llConfProm?: Promise<LovelaceRawConfig>;
  llResProm?: Promise<LovelaceResource[]>;
  recorderInfoProm?: Promise<RecorderInfo>;
}
