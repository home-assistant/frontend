import { LovelaceConfig, LovelaceResource } from "./lovelace";
import { RecorderInfo } from "./recorder";
import { EnergyPreferences } from "./energy";

export interface WindowWithPreloads extends Window {
  llConfProm?: Promise<LovelaceConfig>;
  llResProm?: Promise<LovelaceResource[]>;
  recorderInfoProm?: Promise<RecorderInfo>;
  energyPreferencesProm?: Promise<EnergyPreferences>;
}
