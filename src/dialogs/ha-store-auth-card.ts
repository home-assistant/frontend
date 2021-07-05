import { LitElement, TemplateResult, html, css } from "lit";
import { property } from "lit/decorators";
import { enableWrite } from "../common/auth/token_storage";
import { HomeAssistant } from "../types";
import "../components/ha-card";
import type { HaCard } from "../components/ha-card";
import "@material/mwc-button/mwc-button";

class HaStoreAuth extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      <ha-card>
        <div class="card-content">
          ${this.hass.localize("ui.auth_store.ask")}
        </div>
        <div class="card-actions">
          <mwc-button @click=${this._dismiss}>
            ${this.hass.localize("ui.auth_store.decline")}
          </mwc-button>
          <mwc-button raised @click=${this._save}>
            ${this.hass.localize("ui.auth_store.confirm")}
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  firstUpdated() {
    this.classList.toggle("small", window.innerWidth < 600);
  }

  private _save(): void {
    enableWrite();
    this._dismiss();
  }

  private _dismiss(): void {
    const card = this.shadowRoot!.querySelector("ha-card") as HaCard;
    card.style.bottom = `-${card.offsetHeight + 8}px`;
    setTimeout(() => this.parentNode!.removeChild(this), 300);
  }

  static get styles() {
    return css`
      ha-card {
        position: fixed;
        padding: 8px 0;
        bottom: 16px;
        right: 16px;
        transition: bottom 0.25s;
        --ha-card-box-shadow: 0px 3px 5px -1px rgba(0, 0, 0, 0.2),
          0px 6px 10px 0px rgba(0, 0, 0, 0.14),
          0px 1px 18px 0px rgba(0, 0, 0, 0.12);
      }

      .card-actions {
        text-align: right;
        border-top: 0;
      }

      :host(.small) ha-card {
        bottom: 0;
        left: 0;
        right: 0;
      }
    `;
  }
}

customElements.define("ha-store-auth-card", HaStoreAuth);

declare global {
  interface HTMLElementTagNameMap {
    "ha-store-auth-card": HaStoreAuth;
  }
}
