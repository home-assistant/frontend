import { Condition } from "../../../panels/lovelace/common/validate-condition";

export interface LovelaceBadgeConfig {
  type: string;
  [key: string]: any;
  visibility?: Condition[];
}

export const ensureBadgeConfig = (
  config: Partial<LovelaceBadgeConfig> | string
): LovelaceBadgeConfig => {
  if (typeof config === "string") {
    return {
      type: "entity",
      entity: config,
      display_type: "complete",
    };
  }
  if ("type" in config && config.type) {
    return config as LovelaceBadgeConfig;
  }
  return {
    type: "entity",
    ...config,
  };
};
