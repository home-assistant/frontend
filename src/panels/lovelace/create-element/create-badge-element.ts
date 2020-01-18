import "../badges/hui-entity-filter-badge";
import "../badges/hui-state-label-badge";

import { LovelaceBadgeConfig } from "../../../data/lovelace";
import { createLovelaceElement } from "./create-element-base";

const BADGE_TYPES = new Set(["entity-filter", "error", "state-label"]);

export const createBadgeElement = (config: LovelaceBadgeConfig) =>
  createLovelaceElement("badge", config, BADGE_TYPES, undefined, "state-label");
