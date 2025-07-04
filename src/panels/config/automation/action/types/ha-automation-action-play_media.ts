import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-selector/ha-selector";
import type { PlayMediaAction } from "../../../../../data/script";
import type {
  MediaSelectorValue,
  Selector,
} from "../../../../../data/selector";
import type { HomeAssistant } from "../../../../../types";
import type { ActionElement } from "../ha-automation-action-row";

const MEDIA_SELECTOR_SCHEMA: Selector = {
  media: {},
};

@customElement("ha-automation-action-play_media")
export class HaPlayMediaAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public action!: PlayMediaAction;

  @property({ type: Boolean }) public narrow = false;

  public static get defaultConfig(): PlayMediaAction {
    return {
      action: "media_player.play_media",
      target: { entity_id: "" },
      data: { media_content_id: "", media_content_type: "" },
      metadata: {},
    };
  }

  private _getSelectorValue = memoizeOne(
    (action: PlayMediaAction): MediaSelectorValue => ({
      entity_id: action.target?.entity_id || action.entity_id,
      media_content_id: action.data?.media_content_id,
      media_content_type: action.data?.media_content_type,
      metadata: action.metadata,
    })
  );

  protected render() {
    return html`
      <ha-selector
        .selector=${MEDIA_SELECTOR_SCHEMA}
        .hass=${this.hass}
        .disabled=${this.disabled}
        .value=${this._getSelectorValue(this.action)}
        @value-changed=${this._valueChanged}
      ></ha-selector>
    `;
  }

  private _valueChanged(ev: CustomEvent<{ value: MediaSelectorValue }>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...this.action,
        action: "media_player.play_media",
        target: { entity_id: ev.detail.value.entity_id },
        data: {
          media_content_id: ev.detail.value.media_content_id,
          media_content_type: ev.detail.value.media_content_type,
        },
        metadata: ev.detail.value.metadata || {},
      } as PlayMediaAction,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-play_media": HaPlayMediaAction;
  }
}
