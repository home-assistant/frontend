import { customElement } from "lit/decorators";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import type { ValvePositionFavoriteCardFeatureConfig } from "../../card-features/types";
import { HuiFavoriteCardFeatureEditorBase } from "./hui-favorite-card-feature-editor-base";

@customElement("hui-valve-position-favorite-card-feature-editor")
export class HuiValvePositionFavoriteCardFeatureEditor extends HuiFavoriteCardFeatureEditorBase<ValvePositionFavoriteCardFeatureConfig> {
  protected readonly _descriptionKey =
    "ui.panel.lovelace.editor.features.types.valve-position-favorite.description" satisfies LocalizeKeys;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-valve-position-favorite-card-feature-editor": HuiValvePositionFavoriteCardFeatureEditor;
  }
}
