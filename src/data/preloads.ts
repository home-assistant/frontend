import { LovelaceRawConfig } from "./lovelace/config/types";
import { LovelaceResource } from "./lovelace/resource";
import { RecorderInfo } from "./recorder";

export interface WindowWithPreloads extends Window {
  llConfProm?: Promise<LovelaceRawConfig>;
  llResProm?: Promise<LovelaceResource[]>;
  recorderInfoProm?: Promise<RecorderInfo>;
}
