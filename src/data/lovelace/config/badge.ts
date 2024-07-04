import { Condition } from "../../../panels/lovelace/common/validate-condition";

export interface LovelaceBadgeConfig {
  type?: string;
  [key: string]: any;
  visibility?: Condition[];
}
