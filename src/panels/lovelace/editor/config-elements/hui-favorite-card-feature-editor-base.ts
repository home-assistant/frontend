import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import "../../../../components/ha-alert";
import type { HomeAssistant } from "../../../../types";
import type {
  LovelaceCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

export abstract class HuiFavoriteCardFeatureEditorBase<
  TConfig extends LovelaceCardFeatureConfig,
>
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: TConfig;

  protected abstract readonly _descriptionKey: LocalizeKeys;

  public setConfig(config: TConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-alert alert-type="info">
        ${this.hass.localize(this._descriptionKey)}
      </ha-alert>
    `;
  }
}
