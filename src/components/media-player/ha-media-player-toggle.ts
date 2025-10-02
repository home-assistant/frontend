import { type CSSResultGroup, LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { mdiSpeaker } from "@mdi/js";

import type { HomeAssistant } from "../../types";
import { computeStateName } from "../../common/entity/compute_state_name";
import { fireEvent } from "../../common/dom/fire_event";

import "../ha-switch";
import "../ha-svg-icon";
import type { MediaPlayerEntity } from "../../data/media-player";

@customElement("ha-media-player-toggle")
class HaMediaPlayerToggle extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @property({ type: Boolean }) public checked = false;

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    const stateObj = this.hass.states[this.entityId];
    return html`<div class="list-item">
      <ha-svg-icon .path=${mdiSpeaker}></ha-svg-icon>
      <div class="info">
        <div class="main-text">${computeStateName(stateObj)}</div>
        <div class="secondary-text">
          ${this._formatSecondaryText(stateObj as MediaPlayerEntity)}
        </div>
      </div>
      <ha-switch
        .disabled=${this.disabled}
        .checked=${this.checked}
        @change=${this._handleChange}
      ></ha-switch>
    </div>`;
  }

  private _formatSecondaryText(stateObj: MediaPlayerEntity): string {
    if (stateObj.state !== "playing") {
      return this.hass.localize("ui.card.media_player.idle");
    }

    return [stateObj.attributes.media_title, stateObj.attributes.media_artist]
      .filter((segment) => segment)
      .join(" · ");
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .list-item {
          display: grid;
          grid-template-columns: auto 1fr auto;
          column-gap: var(--ha-space-4);
          align-items: center;
          width: 100%;
        }

        .info {
          min-width: 0;
        }

        .main-text {
          color: var(--primary-text-color);
        }

        .main-text[take-height] {
          line-height: 40px;
        }

        .secondary-text {
          color: var(--secondary-text-color);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `,
    ];
  }

  private _handleChange(ev) {
    ev.stopPropagation();

    this.checked = ev.target.checked;
    fireEvent(this, "change");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-media-player-toggle": HaMediaPlayerToggle;
  }
}
