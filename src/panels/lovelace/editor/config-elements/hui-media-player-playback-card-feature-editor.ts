import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import "../../../../components/ha-form/ha-form";
import type { MediaPlayerEntity } from "../../../../data/media-player";
import type { HomeAssistant } from "../../../../types";
import {
  getDefaultMediaPlayerControls,
  supportsMediaPlayerPlaybackControl,
} from "../../card-features/media-player-playback-controls";
import type {
  LovelaceCardFeatureContext,
  MediaPlayerPlaybackCardFeatureConfig,
} from "../../card-features/types";
import { MEDIA_PLAYER_PLAYBACK_CONTROLS } from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";
import {
  customizableListData,
  customizableListSchema,
  processCustomizableListValue,
} from "./customizable-list-feature";

@customElement("hui-media-player-playback-card-feature-editor")
export class HuiMediaPlayerPlaybackCardFeatureEditor
  extends LitElement
  implements LovelaceCardFeatureEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: MediaPlayerPlaybackCardFeatureConfig;

  public setConfig(config: MediaPlayerPlaybackCardFeatureConfig): void {
    this._config = config;
  }

  private _schema = memoizeOne(
    (stateObj: MediaPlayerEntity | undefined, customize: boolean) =>
      [
        ...customizableListSchema({
          field: "controls",
          customize,
          options: MEDIA_PLAYER_PLAYBACK_CONTROLS.filter(
            (control) =>
              stateObj && supportsMediaPlayerPlaybackControl(stateObj, control)
          ).map((control) => ({
            value: control,
            label: this.hass!.localize(`ui.card.media_player.${control}`),
          })),
        }),
        {
          name: "hide_disabled_controls",
          selector: { boolean: {} },
        },
      ] as const
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const stateObj = this.context?.entity_id
      ? (this.hass.states[this.context.entity_id] as
          MediaPlayerEntity | undefined)
      : undefined;

    const data = customizableListData(this._config, "controls");
    const schema = this._schema(stateObj, data.customize);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        .computeHelper=${this._computeHelperCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const stateObj = this.context?.entity_id
      ? (this.hass!.states[this.context.entity_id] as
          MediaPlayerEntity | undefined)
      : undefined;
    const defaults = getDefaultMediaPlayerControls(stateObj).filter(
      (control) =>
        stateObj && supportsMediaPlayerPlaybackControl(stateObj, control)
    );
    const config =
      processCustomizableListValue<MediaPlayerPlaybackCardFeatureConfig>(
        ev.detail.value,
        "controls",
        defaults
      );
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    this.hass!.localize(
      `ui.panel.lovelace.editor.features.types.media-player-playback.${schema.name}`
    );

  private _computeHelperCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) =>
    schema.name === "hide_disabled_controls"
      ? this.hass!.localize(
          "ui.panel.lovelace.editor.features.types.media-player-playback.hide_disabled_controls_helper"
        )
      : undefined;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-playback-card-feature-editor": HuiMediaPlayerPlaybackCardFeatureEditor;
  }
}
