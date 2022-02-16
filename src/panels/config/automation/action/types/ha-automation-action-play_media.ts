import "@polymer/paper-input/paper-input";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-service-control";
import { PlayMediaAction } from "../../../../../data/script";
import { MediaSelectorValue } from "../../../../../data/selector";
import type { HomeAssistant } from "../../../../../types";
import { ActionElement } from "../ha-automation-action-row";

@customElement("ha-automation-action-play_media")
export class HaPlayMediaAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: PlayMediaAction;

  @property({ type: Boolean }) public narrow = false;

  public static get defaultConfig() {
    return {
      service: "media_player.play_media",
      target: { entity_id: "" },
      data: { media_content_id: "", media_content_type: "" },
      extra: {},
    };
  }

  private _getSelectorValue = memoizeOne(
    (action: PlayMediaAction): MediaSelectorValue => ({
      entity_id: (action.target?.entity_id as string) || action.entity_id,
      media_content_id: action.data?.media_content_id,
      media_content_type: action.data?.media_content_type,
      extra: action.extra,
    })
  );

  protected render() {
    return html`
      <ha-selector-media
        .hass=${this.hass}
        .value=${this._getSelectorValue(this.action)}
        @value-changed=${this._valueChanged}
      ></ha-selector-media>
    `;
  }

  private _valueChanged(ev: CustomEvent<{ value: MediaSelectorValue }>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        service: "media_player.play_media",
        target: { entity_id: ev.detail.value.entity_id },
        data: {
          media_content_id: ev.detail.value.media_content_id,
          media_content_type: ev.detail.value.media_content_type,
        },
        extra: ev.detail.value.extra,
      },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-media_content_id": HaPlayMediaAction;
  }
}
