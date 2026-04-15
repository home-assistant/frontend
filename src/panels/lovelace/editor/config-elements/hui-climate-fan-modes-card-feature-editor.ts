import { customElement } from "lit/decorators";
import type { ClimateFanModesCardFeatureConfig } from "../../card-features/types";
import type { EntityModesCardFeatureEditorDescriptor } from "./hui-entity-modes-card-feature-editor-base";
import { HuiEntityModesCardFeatureEditorBase } from "./hui-entity-modes-card-feature-editor-base";

const DESCRIPTOR: EntityModesCardFeatureEditorDescriptor<ClimateFanModesCardFeatureConfig> =
  {
    featureType: "climate-fan-modes",
    i18nFeatureId: "climate-fan-modes",
    modeField: "fan_modes",
    defaultStyle: "dropdown",
    getAvailableModesOrdered: (s) => s?.attributes.fan_modes ?? [],
    getModeLabel: (hass, stateObj, mode) =>
      stateObj
        ? hass.formatEntityAttributeValue(stateObj, "fan_mode", mode)
        : mode,
  };

@customElement("hui-climate-fan-modes-card-feature-editor")
export class HuiClimateFanModesCardFeatureEditor extends HuiEntityModesCardFeatureEditorBase<ClimateFanModesCardFeatureConfig> {
  protected readonly descriptor = DESCRIPTOR;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-climate-fan-modes-card-feature-editor": HuiClimateFanModesCardFeatureEditor;
  }
}
