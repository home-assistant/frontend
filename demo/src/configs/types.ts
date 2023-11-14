import { LocalizeFunc } from "../../../src/common/translations/localize";
import { LovelaceDashboardConfig } from "../../../src/data/lovelace/config/dashboard";
import { Entity } from "../../../src/fake_data/entity";

export interface DemoConfig {
  index?: number;
  name: string;
  authorName: string;
  authorUrl: string;
  lovelace: (localize: LocalizeFunc) => LovelaceDashboardConfig;
  entities: (localize: LocalizeFunc) => Entity[];
  theme: () => Record<string, string> | null;
}
