import "@material/mwc-button";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import "../../../components/ha-attributes";
import "../../../components/ha-textfield";
import type { HaTextField } from "../../../components/ha-textfield";
import type { HomeAssistant } from "../../../types";

@customElement("more-info-lock")
class MoreInfoLock extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @query("ha-textfield") private _textfield?: HaTextField;

  protected render() {
    if (!this.hass || !this.stateObj) {
      return nothing;
    }
    return html`
      ${this.stateObj.attributes.code_format
        ? html`<div class="code">
            <ha-textfield
              .label=${this.hass.localize("ui.card.lock.code")}
              .pattern=${this.stateObj.attributes.code_format}
              type="password"
            ></ha-textfield>
            ${this.stateObj.state === "locked"
              ? html`<mwc-button
                  @click=${this._callService}
                  data-service="unlock"
                  >${this.hass.localize("ui.card.lock.unlock")}</mwc-button
                >`
              : html`<mwc-button @click=${this._callService} data-service="lock"
                  >${this.hass.localize("ui.card.lock.lock")}</mwc-button
                >`}
          </div>`
        : ""}
      <ha-attributes
        .hass=${this.hass}
        .stateObj=${this.stateObj}
        extra-filters="code_format"
      ></ha-attributes>
    `;
  }

  private _callService(ev) {
    const service = ev.target.getAttribute("data-service");
    const data = {
      entity_id: this.stateObj!.entity_id,
      code: this._textfield?.value,
    };
    this.hass.callService("lock", service, data);
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      flex-direction: column;
    }
    .code {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      margin-bottom: 8px;
      width: 100%;
    }
    ha-attributes {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-lock": MoreInfoLock;
  }
}
