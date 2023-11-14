import { LovelaceDashboardRawConfig } from "./lovelace/config/dashboard";
import { LovelaceResource } from "./lovelace/resource";
import { RecorderInfo } from "./recorder";

export interface WindowWithPreloads extends Window {
  llConfProm?: Promise<LovelaceDashboardRawConfig>;
  llResProm?: Promise<LovelaceResource[]>;
  recorderInfoProm?: Promise<RecorderInfo>;
}
