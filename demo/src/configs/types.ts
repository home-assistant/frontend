import { TemplateResult } from "lit";
import { LocalizeFunc } from "../../../src/common/translations/localize";
import { LovelaceConfig } from "../../../src/data/lovelace/config/types";
import { Entity } from "../../../src/fake_data/entity";

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
