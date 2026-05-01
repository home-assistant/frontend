import { customElement } from "lit/decorators";
import type { HumidifierModesCardFeatureConfig } from "../../card-features/types";
import type { EntityModesCardFeatureEditorDescriptor } from "./hui-entity-modes-card-feature-editor-base";
import { HuiEntityModesCardFeatureEditorBase } from "./hui-entity-modes-card-feature-editor-base";

const DESCRIPTOR: EntityModesCardFeatureEditorDescriptor<HumidifierModesCardFeatureConfig> =
  {
    featureType: "humidifier-modes",
    i18nFeatureId: "humidifier-modes",
    modeField: "modes",
    defaultStyle: "dropdown",
    getAvailableModesOrdered: (s) => s?.attributes.available_modes ?? [],
    getModeLabel: (hass, stateObj, mode) =>
      stateObj ? hass.formatEntityAttributeValue(stateObj, "mode", mode) : mode,
  };

@customElement("hui-humidifier-modes-card-feature-editor")
export class HuiHumidifierModesCardFeatureEditor extends HuiEntityModesCardFeatureEditorBase<HumidifierModesCardFeatureConfig> {
  protected readonly descriptor = DESCRIPTOR;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-humidifier-modes-card-feature-editor": HuiHumidifierModesCardFeatureEditor;
  }
}
