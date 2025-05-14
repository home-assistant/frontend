import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../components/entity/state-info";
import HassMediaPlayerEntity from "../util/hass-media-player-model";
import type { HomeAssistant } from "../types";
import { haStyle } from "../resources/styles";

@customElement("state-card-media_player")
class StateCardMediaPlayer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: "in-dialog", type: Boolean }) public inDialog = false;

  protected render(): TemplateResult {
    const playerObj = new HassMediaPlayerEntity(this.hass, this.stateObj);
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        <div class="state">
          <div class="main-text" take-height=${!playerObj.secondaryTitle}>
            ${this._computePrimaryText(playerObj)}
          </div>
          <div class="secondary-text">${playerObj.secondaryTitle}</div>
        </div>
      </div>
    `;
  }

  private _computePrimaryText(playerObj) {
    return (
      playerObj.primaryTitle || this.hass.formatEntityState(playerObj.stateObj)
    );
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          line-height: var(--ha-line-height-normal);
        }

        .state {
          margin-left: 16px;
          margin-inline-start: 16px;
          margin-inline-end: initial;
          text-align: var(--float-end);
        }

        .main-text {
          color: var(--primary-text-color);
        }

        .main-text[take-height] {
          line-height: 40px;
        }

        .secondary-text {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-media_player": StateCardMediaPlayer;
  }
}
