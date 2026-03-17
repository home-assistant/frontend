import { customElement } from "lit/decorators";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import type { CoverPositionFavoriteCardFeatureConfig } from "../../card-features/types";
import { HuiFavoriteCardFeatureEditorBase } from "./hui-favorite-card-feature-editor-base";

@customElement("hui-cover-position-favorite-card-feature-editor")
export class HuiCoverPositionFavoriteCardFeatureEditor extends HuiFavoriteCardFeatureEditorBase<CoverPositionFavoriteCardFeatureConfig> {
  protected readonly _descriptionKey =
    "ui.panel.lovelace.editor.features.types.cover-position-favorite.description" satisfies LocalizeKeys;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-position-favorite-card-feature-editor": HuiCoverPositionFavoriteCardFeatureEditor;
  }
}
