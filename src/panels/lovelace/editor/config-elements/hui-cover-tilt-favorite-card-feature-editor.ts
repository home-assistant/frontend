import { customElement } from "lit/decorators";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import type { CoverTiltFavoriteCardFeatureConfig } from "../../card-features/types";
import { HuiFavoriteCardFeatureEditorBase } from "./hui-favorite-card-feature-editor-base";

@customElement("hui-cover-tilt-favorite-card-feature-editor")
export class HuiCoverTiltFavoriteCardFeatureEditor extends HuiFavoriteCardFeatureEditorBase<CoverTiltFavoriteCardFeatureConfig> {
  protected readonly _descriptionKey =
    "ui.panel.lovelace.editor.features.types.cover-tilt-favorite.description" satisfies LocalizeKeys;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-tilt-favorite-card-feature-editor": HuiCoverTiltFavoriteCardFeatureEditor;
  }
}
