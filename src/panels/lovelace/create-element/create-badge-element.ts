import { LovelaceBadgeConfig } from "../../../data/lovelace";
import "../badges/hui-state-label-badge";
import { createLovelaceElement } from "./create-element-base";

const ALWAYS_LOADED_TYPES = new Set(["error", "state-label"]);
const LAZY_LOAD_TYPES = {
  "entity-filter": () => import("../badges/hui-entity-filter-badge"),
};

export const createBadgeElement = (config: LovelaceBadgeConfig) =>
  createLovelaceElement(
    "badge",
    config,
    ALWAYS_LOADED_TYPES,
    LAZY_LOAD_TYPES,
    undefined,
    "state-label"
  );
