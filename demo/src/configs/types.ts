import type { TemplateResult } from "lit";
import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { LovelaceConfig } from "../../../src/data/lovelace/config/types";
import type { EntityInput } from "../../../src/fake_data/entities/types";
import type { ThemeSettings } from "../../../src/types";
import type { DemoArea } from "../stubs/area_registry";
import type { DemoFloor } from "../stubs/floor_registry";

export type DemoTheme = ThemeSettings | (() => Record<string, string> | null);

export interface DemoConfig {
  index?: number;
  name: string;
  authorName: string;
  authorUrl: string;
  description?:
    string | ((localize: LocalizeFunc) => string | TemplateResult<1>);
  lovelace: (localize: LocalizeFunc) => LovelaceConfig;
  entities: (localize: LocalizeFunc) => EntityInput[];
  floors?: DemoFloor[];
  areas?: DemoArea[];
  theme: DemoTheme;
}
