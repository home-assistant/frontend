import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-alert";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import type { HomeAssistant } from "../../../../types";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

@customElement("hui-card-feature-more-info-hint-editor")
export class HuiCardFeatureMoreInfoHintEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: LovelaceCardFeatureConfig;

  public setConfig(config: LovelaceCardFeatureConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const descriptionKey =
      `ui.panel.lovelace.editor.features.types.${this._config.type}.description` satisfies LocalizeKeys;

    return html`
      <ha-alert alert-type="info">
        ${this.hass.localize(descriptionKey)}
      </ha-alert>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-feature-more-info-hint-editor": HuiCardFeatureMoreInfoHintEditor;
  }
}
