import { customElement } from "lit/decorators";
import type { ClimatePresetModesCardFeatureConfig } from "../../card-features/types";
import type { EntityModesCardFeatureEditorDescriptor } from "./hui-entity-modes-card-feature-editor-base";
import { HuiEntityModesCardFeatureEditorBase } from "./hui-entity-modes-card-feature-editor-base";

const DESCRIPTOR: EntityModesCardFeatureEditorDescriptor<ClimatePresetModesCardFeatureConfig> =
  {
    featureType: "climate-preset-modes",
    i18nFeatureId: "climate-preset-modes",
    modeField: "preset_modes",
    defaultStyle: "dropdown",
    getAvailableModesOrdered: (s) => s?.attributes.preset_modes ?? [],
    getModeLabel: (hass, stateObj, mode) =>
      stateObj
        ? hass.formatEntityAttributeValue(stateObj, "preset_mode", mode)
        : mode,
  };

@customElement("hui-climate-preset-modes-card-feature-editor")
export class HuiClimatePresetModesCardFeatureEditor extends HuiEntityModesCardFeatureEditorBase<ClimatePresetModesCardFeatureConfig> {
  protected readonly descriptor = DESCRIPTOR;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-preset-modes-card-feature-editor": HuiClimatePresetModesCardFeatureEditor;
  }
}
