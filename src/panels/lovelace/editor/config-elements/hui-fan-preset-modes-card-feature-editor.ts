import { customElement } from "lit/decorators";
import type { FanPresetModesCardFeatureConfig } from "../../card-features/types";
import type { EntityModesCardFeatureEditorDescriptor } from "./hui-entity-modes-card-feature-editor-base";
import { HuiEntityModesCardFeatureEditorBase } from "./hui-entity-modes-card-feature-editor-base";

const DESCRIPTOR: EntityModesCardFeatureEditorDescriptor<FanPresetModesCardFeatureConfig> =
  {
    featureType: "fan-preset-modes",
    i18nFeatureId: "fan-preset-modes",
    modeField: "preset_modes",
    defaultStyle: "dropdown",
    getAvailableModesOrdered: (s) => s?.attributes.preset_modes ?? [],
    getModeLabel: (hass, stateObj, mode) =>
      stateObj
        ? hass.formatEntityAttributeValue(stateObj, "preset_mode", mode)
        : mode,
  };

@customElement("hui-fan-preset-modes-card-feature-editor")
export class HuiFanPresetModesCardFeatureEditor extends HuiEntityModesCardFeatureEditorBase<FanPresetModesCardFeatureConfig> {
  protected readonly descriptor = DESCRIPTOR;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-fan-preset-modes-card-feature-editor": HuiFanPresetModesCardFeatureEditor;
  }
}
