import "@material/mwc-button";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { supportsFeature } from "../common/entity/supports-feature";
import "../components/entity/state-info";
import { callProtectedLockService, LockEntityFeature } from "../data/lock";
import { HomeAssistant } from "../types";
import { haStyle } from "../resources/styles";

@customElement("state-card-lock")
class StateCardLock extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ type: Boolean }) public inDialog = false;

  protected render(): TemplateResult {
    const isLocked = this.stateObj.state === "locked";
    const supportsOpen = supportsFeature(this.stateObj, LockEntityFeature.OPEN);

    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        ${!supportsOpen
          ? html`<mwc-button @click=${this._callService} data-service="open"
              >${this.hass.localize("ui.card.lock.open")}</mwc-button
            >`
          : nothing}
        ${isLocked
          ? html` <mwc-button @click=${this._callService} data-service="unlock"
              >${this.hass.localize("ui.card.lock.unlock")}</mwc-button
            >`
          : nothing}
        ${!isLocked
          ? html`<mwc-button @click=${this._callService} data-service="lock"
              >${this.hass.localize("ui.card.lock.lock")}</mwc-button
            >`
          : nothing}
      </div>
    `;
  }

  private async _callService(ev) {
    ev.stopPropagation();
    const service = ev.target.dataset.service;
    if (!this.hass || !this.stateObj) {
      return;
    }
    await callProtectedLockService(this, this.hass, this.stateObj, service);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        mwc-button {
          top: 3px;
          height: 37px;
          margin-right: -0.57em;
          margin-inline-end: -0.57em;
          margin-inline-start: initial;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-lock": StateCardLock;
  }
}
