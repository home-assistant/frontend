import { html, LitElement } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-button/paper-button";

import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { getElementTag } from "../common/get-element-tag";

const cards = [
  { name: "Alarm panel", type: "alarm-panel" },
  { name: "Entities", type: "entities" },
  { name: "Glance", type: "glance" },
];

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

function uid() {
  return s4() + s4() + s4() + s4() + s4();
}
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
    const type = ev.currentTarget!.type;
    const tag = getElementTag(type);

    const elClass = customElements.get(tag);
    let config: LovelaceCardConfig = { type, id: uid() };

    try {
      const cardConfig = elClass.getStubConfig(this.hass);
      config = { ...config, ...cardConfig };
    } finally {
      fireEvent(this, "card-picked", {
        config,
      });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-picker": HuiCardPicker;
  }
}

customElements.define("hui-card-picker", HuiCardPicker);
