import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { HomeAssistant } from "../../../../types";
import type {
  MediaPlayerVolumeSliderCardFeatureConfig,
  LovelaceCardFeatureContext,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

@customElement("hui-media-player-volume-slider-card-feature-editor")
export class HuiMediaPlayerVolumeSliderCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: MediaPlayerVolumeSliderCardFeatureConfig;

  public setConfig(config: MediaPlayerVolumeSliderCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    () =>
      [
        {
          name: "min",
          selector: {
            number: {
              min: 0,
              max: 100,
              mode: "slider",
            },
          },
        },
        {
          name: "max",
          selector: {
            number: {
              min: 0,
              max: 100,
              mode: "slider",
            },
          },
        },
        {
          name: "step",
          selector: {
            number: {
              min: 1,
              max: 10,
              mode: "slider",
            },
          },
        },
      ] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const data: MediaPlayerVolumeSliderCardFeatureConfig = {
      min: 0,
      max: 100,
      step: 1,
      ...this._config,
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
      `ui.panel.lovelace.editor.features.types.media-player-volume-slider.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-volume-slider-card-feature-editor": HuiMediaPlayerVolumeSliderCardFeatureEditor;
  }
}
