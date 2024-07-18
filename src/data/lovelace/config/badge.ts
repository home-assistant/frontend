import { Condition } from "../../../panels/lovelace/common/validate-condition";

export interface LovelaceBadgeConfig {
  type?: string;
  [key: string]: any;
  visibility?: Condition[];
}

export const defaultBadgeConfig = (entity_id: string): LovelaceBadgeConfig => ({
  type: "entity",
  entity: entity_id,
});
