import type { TemplateResult } from "lit";
import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { LovelaceConfig } from "../../../src/data/lovelace/config/types";
import type { Entity } from "../../../src/fake_data/entity";

export interface DemoConfig {
  index?: number;
  name: string;
  authorName: string;
  authorUrl: string;
  description?:
    | string
    | ((localize: LocalizeFunc) => string | TemplateResult<1>);
  lovelace: (localize: LocalizeFunc) => LovelaceConfig;
  entities: (localize: LocalizeFunc) => Entity[];
  theme: () => Record<string, string> | null;
}
