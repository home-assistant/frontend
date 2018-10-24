import { html, LitElement } from "@polymer/lit-element";

import createCardElement from "../common/create-card-element.js";

import { LovelaceCard, LovelaceConfig } from "../types";
import { HomeAssistant } from "../../../types";

interface Config extends LovelaceConfig {
    cards: LovelaceConfig[];
}

export default class HuiStackCard extends LitElement implements LovelaceCard {
    protected config?: Config;
    private mhass?: HomeAssistant;

    static get properties() {
        return {
            config: {},
        };
    }

    set hass(hass: HomeAssistant) {
        this.mhass = hass;
        for (const el of this.shadowRoot!.querySelectorAll("#root > *")) {
            const element = el as LovelaceCard;
            element.hass = this.mhass;
        }
    }

    public getCardSize() {
        return 1;
    }

    public setConfig(config: Config) {
        if (!config || !config.cards || !Array.isArray(config.cards)) {
            throw new Error("Card config incorrect");
        }
        this.config = config;
    }

    protected render() {
        if (!this.config) {
            return html``;
        }

        return html`
      ${this.renderStyle()}
      <div id="root">
        ${this.config.cards.map((card) => this.createCardElement(card))}
      </div>
    `;
    }

    protected renderStyle() {
        return html``;
    }

    private createCardElement(card: LovelaceConfig): LovelaceCard {
        const element = createCardElement(card) as LovelaceCard;
        element.hass = this.mhass;
        return element;
    }
}
