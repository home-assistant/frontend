import { customElement } from "lit/decorators";
import { compareWaterHeaterOperationMode } from "../../../../data/water_heater";
import type { WaterHeaterOperationModesCardFeatureConfig } from "../../card-features/types";
import type { EntityModesCardFeatureEditorDescriptor } from "./hui-entity-modes-card-feature-editor-base";
import { HuiEntityModesCardFeatureEditorBase } from "./hui-entity-modes-card-feature-editor-base";

const DESCRIPTOR: EntityModesCardFeatureEditorDescriptor<WaterHeaterOperationModesCardFeatureConfig> =
  {
    featureType: "water-heater-operation-modes",
    i18nFeatureId: "water-heater-operation-modes",
    modeField: "operation_modes",
    defaultStyle: "icons",
    getAvailableModesOrdered: (s) =>
      (s?.attributes.operation_list ?? [])
        .concat()
        .sort(compareWaterHeaterOperationMode),
    getModeLabel: (hass, stateObj, mode) =>
      stateObj ? hass.formatEntityState(stateObj, mode) : mode,
  };

@customElement("hui-water-heater-operation-modes-card-feature-editor")
export class HuiWaterHeaterOperationModesCardFeatureEditor extends HuiEntityModesCardFeatureEditorBase<WaterHeaterOperationModesCardFeatureConfig> {
  protected readonly descriptor = DESCRIPTOR;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-water-heater-operation-modes-card-feature-editor": HuiWaterHeaterOperationModesCardFeatureEditor;
  }
}
