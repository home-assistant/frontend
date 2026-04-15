import { customElement } from "lit/decorators";
import type { ClimateSwingModesCardFeatureConfig } from "../../card-features/types";
import type { EntityModesCardFeatureEditorDescriptor } from "./hui-entity-modes-card-feature-editor-base";
import { HuiEntityModesCardFeatureEditorBase } from "./hui-entity-modes-card-feature-editor-base";

const DESCRIPTOR: EntityModesCardFeatureEditorDescriptor<ClimateSwingModesCardFeatureConfig> =
  {
    featureType: "climate-swing-modes",
    i18nFeatureId: "climate-swing-modes",
    modeField: "swing_modes",
    defaultStyle: "dropdown",
    getAvailableModesOrdered: (s) => s?.attributes.swing_modes ?? [],
    getModeLabel: (hass, stateObj, mode) =>
      stateObj
        ? hass.formatEntityAttributeValue(stateObj, "swing_mode", mode)
        : mode,
  };

@customElement("hui-climate-swing-modes-card-feature-editor")
export class HuiClimateSwingModesCardFeatureEditor extends HuiEntityModesCardFeatureEditorBase<ClimateSwingModesCardFeatureConfig> {
  protected readonly descriptor = DESCRIPTOR;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-swing-modes-card-feature-editor": HuiClimateSwingModesCardFeatureEditor;
  }
}
