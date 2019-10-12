import { createCardElement } from "../common/create-card-element";
import { computeCardSize } from "../common/compute-card-size";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { RestrictionCardConfig } from "./types";
import {
  TemplateResult,
  customElement,
  LitElement,
  property,
  html,
  CSSResult,
  css,
} from "lit-element";
import { LovelaceCardConfig } from "../../../data/lovelace";

@customElement("hui-restriction-card")
class HuiRestrictionCard extends LitElement implements LovelaceCard {
  @property() protected _config?: RestrictionCardConfig;
  protected _hass?: HomeAssistant;

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    const element = this.shadowRoot!.querySelector("#card > *") as any;
    if (element) {
      element.hass = hass;
    }
  }

  public getCardSize(): number {
    return computeCardSize(this._config!.card);
  }

  public setConfig(config: RestrictionCardConfig): void {
    if (!config.card) {
      throw new Error("Error in card configuration.");
    }

    if (
      config.restrictions &&
      config.restrictions.pin &&
      !config.restrictions.pin.code
    ) {
      throw new Error("A pin code is required for pin restrictions");
    }

    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this._hass) {
      return html``;
    }

    return html`
      <div>
        ${this._config.exemptions &&
        this._config.exemptions.some((e) => e.user === this._hass!.user!.id)
          ? ""
          : html`
              <div @click=${this._handleClick} id="overlay">
                <ha-icon icon="hass:lock-outline" id="lock"></ha-icon>
              </div>
            `}
        ${this.renderCard(this._config.card)}
      </div>
    `;
  }

  private renderCard(config: LovelaceCardConfig): TemplateResult {
    const element = createCardElement(config);
    if (this._hass) {
      element.hass = this._hass;
    }

    return html`
      <div id="card">
        ${element}
      </div>
    `;
  }

  private _handleClick(): void {
    if (this._config!.restrictions) {
      if (
        this._config!.restrictions.block &&
        (!this._config!.restrictions.block.exemptions ||
          !this._config!.restrictions.block.exemptions.some(
            (e) => e.user === this._hass!.user!.id
          ))
      ) {
        alert("This card is blocked");
        return;
      }

      if (
        this._config!.restrictions.pin &&
        this._config!.restrictions.pin.code &&
        (!this._config!.restrictions.pin.exemptions ||
          !this._config!.restrictions.pin.exemptions.some(
            (e) => e.user === this._hass!.user!.id
          ))
      ) {
        const pin = prompt("Input pin code");

        // tslint:disable-next-line: triple-equals
        if (pin != this._config!.restrictions.pin.code) {
          alert("Invalid pin entered");
          return;
        }
      }

      if (
        this._config!.restrictions.confirm &&
        (!this._config!.restrictions.confirm.exemptions ||
          !this._config!.restrictions.confirm.exemptions.some(
            (e) => e.user === this._hass!.user!.id
          ))
      ) {
        if (!confirm("Are you sure you want to unlock?")) {
          return;
        }
      }
    }

    const overlay = this.shadowRoot!.getElementById("overlay") as LitElement;
    overlay.style.setProperty("pointer-events", "none");
    const lock = this.shadowRoot!.getElementById("lock") as LitElement;

    lock.classList.add("fadeOut");

    window.setTimeout(() => {
      overlay.style.setProperty("pointer-events", "");
      if (lock) {
        lock.classList.remove("fadeOut");
      }
    }, 5000);
  }

  static get styles(): CSSResult {
    return css`
      :host {
        position: relative;
      }

      #overlay {
        align-items: flex-start;
        padding: 8px 7px;
        opacity: 0.5;
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        z-index: 50;
        display: flex;
      }

      #lock {
        -webkit-animation-duration: 5s;
        animation-duration: 5s;
        -webkit-animation-fill-mode: both;
        animation-fill-mode: both;
        margin: unset;
      }

      @keyframes fadeOut {
        0% {
          opacity: 0.5;
        }
        20% {
          opacity: 0;
        }
        80% {
          opacity: 0;
        }
        100% {
          opacity: 0.5;
        }
      }

      .fadeOut {
        -webkit-animation-name: fadeOut;
        animation-name: fadeOut;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-restriction-card": HuiRestrictionCard;
  }
}
