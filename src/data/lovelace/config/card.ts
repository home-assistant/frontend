import { LovelaceGridOptions } from "../../../panels/lovelace/types";

export interface LovelaceCardConfig {
  index?: number;
  view_index?: number;
  view_layout?: any;
  grid_options?: LovelaceGridOptions;
  type: string;
  [key: string]: any;
}
