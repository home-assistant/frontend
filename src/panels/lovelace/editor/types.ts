import { LovelaceConfig } from "../types";

export interface YamlChangedEvent extends Event {
  detail: {
    yaml: string;
  };
}

export interface ConfigValue {
  format: "js" | "yaml";
  value: string | LovelaceConfig;
}
