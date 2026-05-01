import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import "../../../../components/ha-form/ha-form";
import type { MediaPlayerEntity } from "../../../../data/media-player";
import type { HomeAssistant } from "../../../../types";
import { supportsMediaPlayerPlaybackControl } from "../../card-features/hui-media-player-playback-card-feature";
import {
  MEDIA_PLAYER_PLAYBACK_CONTROLS,
  type LovelaceCardFeatureContext,
  type MediaPlayerPlaybackCardFeatureConfig,
} from "../../card-features/types";
import type { LovelaceCardFeatureEditor } from "../../types";

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
    (localize: LocalizeFunc, stateObj?: MediaPlayerEntity) =>
      [
        {
          name: "controls",
          selector: {
            select: {
              multiple: true,
              mode: "list" as const,
              reorder: true,
              options: MEDIA_PLAYER_PLAYBACK_CONTROLS.filter(
                (control) =>
                  stateObj &&
                  supportsMediaPlayerPlaybackControl(stateObj, control)
              ).map((control) => ({
                value: control,
                label: localize(`ui.card.media_player.${control}`),
              })),
            },
          },
        },
      ] as const
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

    const schema = this._schema(this.hass.localize, stateObj);

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
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
  ) => {
    switch (schema.name) {
      case "controls":
        return this.hass!.localize(
          `ui.panel.lovelace.editor.features.types.media-player-playback.${schema.name}`
        );
      default:
        return this.hass!.localize(
          `ui.panel.lovelace.editor.card.generic.${schema.name}`
        );
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-playback-card-feature-editor": HuiMediaPlayerPlaybackCardFeatureEditor;
  }
}
