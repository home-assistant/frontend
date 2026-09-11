import type { VisibilityCondition } from "../../../panels/lovelace/common/validate-condition";

export interface LovelaceBadgeConfig {
  type: string;
  [key: string]: any;
  visibility?: VisibilityCondition[];
  disabled?: boolean;
}

export const ensureBadgeConfig = (
  config: Partial<LovelaceBadgeConfig> | string
): LovelaceBadgeConfig => {
  if (typeof config === "string") {
    return {
      type: "entity",
      entity: config,
      show_name: true,
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
