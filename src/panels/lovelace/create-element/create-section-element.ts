import { LovelaceSectionElement } from "../../../data/lovelace";
import { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import { HuiErrorCard } from "../cards/hui-error-card";
import "../sections/hui-grid-section";
import { createLovelaceElement } from "./create-element-base";

const ALWAYS_LOADED_LAYOUTS = new Set(["grid"]);

const LAZY_LOAD_LAYOUTS = {};

export const createSectionElement = (
  config: LovelaceSectionConfig
): LovelaceSectionElement | HuiErrorCard =>
  createLovelaceElement(
    "section",
    config,
    ALWAYS_LOADED_LAYOUTS,
    LAZY_LOAD_LAYOUTS
  );
