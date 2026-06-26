import { customElement } from "lit/decorators";
import { compareClimateHvacModes } from "../../../../data/climate";
import type { ClimateHvacModesCardFeatureConfig } from "../../card-features/types";
import type { EntityModesCardFeatureEditorDescriptor } from "./hui-entity-modes-card-feature-editor-base";
import { HuiEntityModesCardFeatureEditorBase } from "./hui-entity-modes-card-feature-editor-base";

const DESCRIPTOR: EntityModesCardFeatureEditorDescriptor<ClimateHvacModesCardFeatureConfig> =
  {
    featureType: "climate-hvac-modes",
    i18nFeatureId: "climate-hvac-modes",
    styleListI18nFeatureId: "climate-preset-modes",
    modeField: "hvac_modes",
    defaultStyle: "icons",
    getAvailableModesOrdered: (s) =>
      (s?.attributes.hvac_modes ?? []).concat().sort(compareClimateHvacModes),
    getModeLabel: (hass, stateObj, mode) =>
      stateObj ? hass.formatEntityState(stateObj, mode) : mode,
  };

@customElement("hui-climate-hvac-modes-card-feature-editor")
export class HuiClimateHvacModesCardFeatureEditor extends HuiEntityModesCardFeatureEditorBase<ClimateHvacModesCardFeatureConfig> {
  protected readonly descriptor = DESCRIPTOR;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-hvac-modes-card-feature-editor": HuiClimateHvacModesCardFeatureEditor;
  }
}
