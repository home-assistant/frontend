import { customElement } from "lit/decorators";
import type { ClimateSwingHorizontalModesCardFeatureConfig } from "../../card-features/types";
import type { EntityModesCardFeatureEditorDescriptor } from "./hui-entity-modes-card-feature-editor-base";
import { HuiEntityModesCardFeatureEditorBase } from "./hui-entity-modes-card-feature-editor-base";

const DESCRIPTOR: EntityModesCardFeatureEditorDescriptor<ClimateSwingHorizontalModesCardFeatureConfig> =
  {
    featureType: "climate-swing-horizontal-modes",
    i18nFeatureId: "climate-swing-horizontal-modes",
    modeField: "swing_horizontal_modes",
    defaultStyle: "dropdown",
    getAvailableModesOrdered: (s) => s?.attributes.swing_horizontal_modes ?? [],
    getModeLabel: (hass, stateObj, mode) =>
      stateObj
        ? hass.formatEntityAttributeValue(
            stateObj,
            "swing_horizontal_mode",
            mode
          )
        : mode,
  };

@customElement("hui-climate-swing-horizontal-modes-card-feature-editor")
export class HuiClimateSwingHorizontalModesCardFeatureEditor extends HuiEntityModesCardFeatureEditorBase<ClimateSwingHorizontalModesCardFeatureConfig> {
  protected readonly descriptor = DESCRIPTOR;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-swing-horizontal-modes-card-feature-editor": HuiClimateSwingHorizontalModesCardFeatureEditor;
  }
}
