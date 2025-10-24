import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type {
  LovelaceCardFeatureContext,
  MediaPlayerVolumeButtonsCardFeatureConfig,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

@customElement("hui-media-player-volume-buttons-card-feature-editor")
export class HuiMediaPlayerVolumeButtonsCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: MediaPlayerVolumeButtonsCardFeatureConfig;

  public setConfig(config: MediaPlayerVolumeButtonsCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    () =>
      [
        {
          name: "step",
          selector: {
            number: {
              mode: "slider",
              step: 1,
              min: 1,
              max: 100,
              unit_of_measurement: "%",
            },
          },
        },
      ] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data: MediaPlayerVolumeButtonsCardFeatureConfig = {
      type: "media-player-volume-buttons",
      step: this._config.step ?? 5,
    };

    const schema = this._schema();

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    fireEvent(this, "config-changed", { config: ev.detail.value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass!.localize(
      `ui.panel.lovelace.editor.features.types.media-player-volume-buttons.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-volume-buttons-card-feature-editor": HuiMediaPlayerVolumeButtonsCardFeatureEditor;
  }
}
