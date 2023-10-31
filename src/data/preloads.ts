import { LovelaceConfig, LovelaceResource } from "./lovelace";
import { RecorderInfo } from "./recorder";

export interface WindowWithPreloads extends Window {
  llConfProm?: Promise<LovelaceConfig>;
  llResProm?: Promise<LovelaceResource[]>;
  recorderInfoProm?: Promise<RecorderInfo>;
}
