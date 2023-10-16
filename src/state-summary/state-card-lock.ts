import "@material/mwc-button";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { supportsFeature } from "../common/entity/supports-feature";
import "../components/entity/state-info";
import { LockEntityFeature } from "../data/lock";
import { HomeAssistant } from "../types";
import { haStyle } from "../resources/styles";

@customElement("state-card-lock")
class StateCardLock extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ type: Boolean }) public inDialog = false;

  @state() private _isLocked: boolean = false;

  @state() private _supportsOpen: boolean = false;

  protected render(): TemplateResult {
    return html`
      <div class="horizontal justified layout">
        <state-info
          .hass=${this.hass}
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        ${!this._supportsOpen
          ? html`<mwc-button @click=${this._callService} data-service="open"
              >${this.hass.localize("ui.card.lock.open")}</mwc-button
            >`
          : nothing}
        ${this._isLocked
          ? html` <mwc-button @click=${this._callService} data-service="unlock"
              >${this.hass.localize("ui.card.lock.unlock")}</mwc-button
            >`
          : nothing}
        ${!this._isLocked
          ? html`<mwc-button @click=${this._callService} data-service="lock"
              >${this.hass.localize("ui.card.lock.lock")}</mwc-button
            >`
          : nothing}
      </div>
    `;
  }

  protected willUpdate(changedProp: PropertyValues): void {
    super.willUpdate(changedProp);
    if (changedProp.has("stateObj")) {
      this._stateObjChanged(this.stateObj);
    }
  }

  private _stateObjChanged(newVal) {
    if (newVal) {
      this._isLocked = newVal.state === "locked";
      this._supportsOpen = supportsFeature(newVal, LockEntityFeature.OPEN);
    }
  }

  private async _callService(ev) {
    ev.stopPropagation();
    const service = ev.target.dataset.service;
    const data = {
      entity_id: this.stateObj.entity_id,
    };
    await this.hass.callService("lock", service, data);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        mwc-button {
          top: 3px;
          height: 37px;
          margin-right: -0.57em;
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
