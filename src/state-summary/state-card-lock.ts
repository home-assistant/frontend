import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { supportsFeature } from "../common/entity/supports-feature";
import "../components/entity/state-info";
import "../components/ha-button";
import { callProtectedLockService, LockEntityFeature } from "../data/lock";
import type { HomeAssistantApi } from "../types";
import { haStyle } from "../resources/styles";
import { consume } from "../common/decorators/consume";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";
import { apiContext } from "../data/context";

@customElement("state-card-lock")
class StateCardLock extends LitElement {
  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @property({ attribute: false }) public stateObj!: HassEntity;

  @property({ attribute: "in-dialog", type: Boolean }) public inDialog = false;

  protected render(): TemplateResult {
    const isLocked = this.stateObj.state === "locked";
    const supportsOpen = supportsFeature(this.stateObj, LockEntityFeature.OPEN);

    return html`
      <div class="horizontal justified layout">
        <state-info
          .stateObj=${this.stateObj}
          .inDialog=${this.inDialog}
        ></state-info>
        ${
          supportsOpen
            ? html`<ha-button
                appearance="plain"
                size="s"
                @click=${this._callService}
                data-service="open"
                >${this._localize("ui.card.lock.open")}</ha-button
              >`
            : nothing
        }
        ${
          isLocked
            ? html` <ha-button
                appearance="plain"
                size="s"
                @click=${this._callService}
                data-service="unlock"
                >${this._localize("ui.card.lock.unlock")}</ha-button
              >`
            : nothing
        }
        ${
          !isLocked
            ? html`<ha-button
                appearance="plain"
                size="s"
                @click=${this._callService}
                data-service="lock"
                >${this._localize("ui.card.lock.lock")}</ha-button
              >`
            : nothing
        }
      </div>
    `;
  }

  private async _callService(ev) {
    ev.stopPropagation();
    const service = ev.target.dataset.service;
    if (!this.stateObj) {
      return;
    }
    await callProtectedLockService(
      this,
      this._api.callService,
      this._api.callWS,
      this._localize,
      this.stateObj,
      service
    );
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-button {
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
