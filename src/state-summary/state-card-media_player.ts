import type { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { computeStateDisplay } from "../common/entity/compute_state_display";
import "../components/entity/state-info";
import HassMediaPlayerEntity from "../util/hass-media-player-model";
import { HomeAssistant } from "../types";
import { haStyle } from "../resources/styles";

@customElement("state-card-media_player")
class StateCardMediaPlayer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ type: Boolean }) public inDialog = false;

  private _computePlayerObj = memoizeOne(
    (hass: HomeAssistant, stateObj: HassEntity) =>
      new HassMediaPlayerEntity(hass, stateObj)
  );

  protected render(): TemplateResult {
    const _playerObj = this._computePlayerObj(this.hass, this.stateObj);
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        <div class="state">
          <div class="main-text" take-height=${!_playerObj.secondaryTitle}>
            ${this._computePrimaryText(this.hass.localize, _playerObj)}
          </div>
          <div class="secondary-text">${_playerObj.secondaryTitle}</div>
        </div>
      </div>
    `;
  }

  private _computePrimaryText(localize, playerObj) {
    return (
      playerObj.primaryTitle ||
      computeStateDisplay(
        localize,
        playerObj.stateObj,
        this.hass.locale,
        this.hass.config,
        this.hass.entities
      )
    );
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          line-height: 1.5;
        }

        .state {
          @apply --paper-font-common-nowrap;
          @apply --paper-font-body1;
          margin-left: 16px;
          text-align: right;
        }

        .main-text {
          @apply --paper-font-common-nowrap;
          color: var(--primary-text-color);
        }

        .main-text[take-height] {
          line-height: 40px;
        }

        .secondary-text {
          @apply --paper-font-common-nowrap;
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
