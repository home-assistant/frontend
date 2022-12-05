import "@material/mwc-button";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, TemplateResult } from "lit";
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

  protected render(): TemplateResult {
    if (!this.hass || !this.stateObj) {
      return html``;
    }
    return html`
      ${this.stateObj.attributes.code_format
        ? html`
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
          `
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
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-lock": MoreInfoLock;
  }
}
