import type { Condition } from "../../../panels/lovelace/common/validate-condition";
import type {
  LovelaceGridOptions,
  LovelaceLayoutOptions,
} from "../../../panels/lovelace/types";

export interface LovelaceCardConfig {
  index?: number;
  view_index?: number;
  view_layout?: any;
  /** @deprecated Use `grid_options` instead */
  layout_options?: LovelaceLayoutOptions;
  grid_options?: LovelaceGridOptions;
  type: string;
  [key: string]: any;
  visibility?: Condition[];
  hidden?: boolean;
}
