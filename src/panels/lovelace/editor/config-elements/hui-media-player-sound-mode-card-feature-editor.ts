import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { MediaPlayerEntity } from "../../../../data/media-player";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import type {
  LovelaceCardFeatureContext,
  MediaPlayerSoundModeCardFeatureConfig,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";
import {
  customizableListData,
  customizableListSchema,
  processCustomizableListValue,
} from "./customizable-list-feature";

@customElement("hui-media-player-sound-mode-card-feature-editor")
export class HuiMediaPlayerSoundModeCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: MediaPlayerSoundModeCardFeatureConfig;

  public setConfig(config: MediaPlayerSoundModeCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (stateObj: MediaPlayerEntity | undefined, customize: boolean) =>
      customizableListSchema({
        field: "sound_modes",
        customize,
        options:
          stateObj?.attributes.sound_mode_list?.map((mode) => ({
            value: mode,
            label: this.hass!.formatEntityAttributeValue(
              stateObj,
              "sound_mode",
              mode
            ),
          })) ?? [],
      })
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.context?.entity_id
      ? (this.hass.states[this.context.entity_id] as
          | MediaPlayerEntity
          | undefined)
      : undefined;

    const data = customizableListData(this._config, "sound_modes");
    const schema = this._schema(stateObj, data.customize);

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
    ev: ValueChangedEvent<MediaPlayerSoundModeCardFeatureConfig>
  ): void {
    const stateObj = this.context?.entity_id
      ? (this.hass!.states[this.context.entity_id] as
          | MediaPlayerEntity
          | undefined)
      : undefined;
    const defaults = stateObj?.attributes.sound_mode_list ?? [];
    const config =
      processCustomizableListValue<MediaPlayerSoundModeCardFeatureConfig>(
        ev.detail.value,
        "sound_modes",
        defaults
      );
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass!.localize(
      `ui.panel.lovelace.editor.features.types.media-player-sound-mode.${schema.name}`
    );
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-sound-mode-card-feature-editor": HuiMediaPlayerSoundModeCardFeatureEditor;
  }
}
