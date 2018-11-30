import { html, LitElement } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-button/paper-button";

import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";

const cards = [
  { name: "Alarm panel", type: "alarm-panel" },
  { name: "Entities", type: "entities" },
  { name: "Glance", type: "glance" },
];

export class HuiCardPicker extends LitElement {
  protected hass?: HomeAssistant;

  protected render(): TemplateResult {
    return html`
      ${this.renderStyle()}
      ${
        cards.map((card) => {
          return html`
            <paper-button
              elevated
              @click="${this._cardPicked}"
              .type="${card.type}"
              >${card.name}</paper-button
            >
          `;
        })
      }
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        :host {
        }
        paper-button {
        }
      </style>
    `;
  }

  private _cardPicked(ev: Event): void {
    const config = { type: ev.currentTarget!.type, id: this._uid() };
    fireEvent(this, "card-picked", {
      config,
    });
  }

  private _s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  private _uid() {
    return (
      this._s4() +
      this._s4() +
      "-" +
      this._s4() +
      "-" +
      this._s4() +
      "-" +
      this._s4() +
      "-" +
      this._s4() +
      this._s4() +
      this._s4()
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-picker": HuiCardPicker;
  }
}

customElements.define("hui-card-picker", HuiCardPicker);
