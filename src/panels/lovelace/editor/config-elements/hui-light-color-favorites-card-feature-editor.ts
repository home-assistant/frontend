import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-alert";
import type { HomeAssistant } from "../../../../types";
import type {
  LightColorFavoritesCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

@customElement("hui-light-color-favorites-card-feature-editor")
export class HuiLightColorFavoritesCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: LightColorFavoritesCardFeatureConfig;

  public setConfig(config: LightColorFavoritesCardFeatureConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-alert alert-type="info">
        ${this.hass.localize(
          "ui.panel.lovelace.editor.features.types.light-color-favorites.description"
        )}
      </ha-alert>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-light-color-favorites-card-feature-editor": HuiLightColorFavoritesCardFeatureEditor;
  }
}
