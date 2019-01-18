import { LovelaceConfig } from "../../../src/data/lovelace";

export interface DemoLovelaceConfig extends LovelaceConfig {
  demoIndex?: number;
  demoConfigName: string;
  demoAuthorName: string;
  demoAuthorUrl: string;
}
