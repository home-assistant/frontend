import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-multi-textfield";
import { DEFAULT_COVER_FAVORITE_POSITIONS } from "../../../../data/cover";
import type { HomeAssistant } from "../../../../types";
import type {
  CoverPositionPresetCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

@customElement("hui-cover-position-preset-card-feature-editor")
export class HuiCoverPositionPresetCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: CoverPositionPresetCardFeatureConfig;

  public setConfig(config: CoverPositionPresetCardFeatureConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const positions =
      this._config.positions ?? DEFAULT_COVER_FAVORITE_POSITIONS;

    const stringValues = positions.map((p) => String(p));

    return html`
      <ha-multi-textfield
        .hass=${this.hass}
        .value=${stringValues}
        .max=${6}
        .label=${this.hass.localize(
          "ui.panel.lovelace.editor.features.types.cover-position-preset.position"
        )}
        .inputType=${"number"}
        .inputSuffix=${"%"}
        .addLabel=${this.hass.localize(
          "ui.panel.lovelace.editor.features.types.cover-position-preset.add_position"
        )}
        .removeLabel=${this.hass.localize(
          "ui.panel.lovelace.editor.features.types.cover-position-preset.remove_position"
        )}
        @value-changed=${this._valueChanged}
      ></ha-multi-textfield>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const stringValues = ev.detail.value as (string | null | undefined)[];
    const positions = stringValues
      .filter((v): v is string => !!v && !isNaN(Number(v)))
      .map((v) => Math.min(100, Math.max(0, Number(v))));

    const config: CoverPositionPresetCardFeatureConfig = {
      ...this._config!,
      positions,
    };

    this._config = config;

    fireEvent(this, "config-changed", { config });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-position-preset-card-feature-editor": HuiCoverPositionPresetCardFeatureEditor;
  }
}
