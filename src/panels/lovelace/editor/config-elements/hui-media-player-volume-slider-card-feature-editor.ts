import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import { MediaPlayerEntityFeature } from "../../../../data/media-player";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type {
  LovelaceCardFeatureContext,
  MediaPlayerVolumeSliderCardFeatureConfig,
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
    (supportsMute: boolean) =>
      [
        {
          name: "show_mute_button",
          disabled: !supportsMute,
          selector: { boolean: {} },
        },
      ] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.context?.entity_id
      ? this.hass.states[this.context.entity_id]
      : undefined;
    const supportsMute =
      !!stateObj &&
      supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_MUTE);

    const data: MediaPlayerVolumeSliderCardFeatureConfig = {
      type: "media-player-volume-slider",
      show_mute_button: this._config.show_mute_button ?? true,
    };

    const schema = this._schema(supportsMute);

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

  private _valueChanged(
    ev: ValueChangedEvent<MediaPlayerVolumeSliderCardFeatureConfig>
  ): void {
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
