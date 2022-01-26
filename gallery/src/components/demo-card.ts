import { load } from "js-yaml";
import { html, css, LitElement, PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { createCardElement } from "../../../src/panels/lovelace/create-element/create-card-element";
import { HomeAssistant } from "../../../src/types";

export interface DemoCardConfig {
  heading: string;
  config: string;
}

@customElement("demo-card")
class DemoCard extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public config!: DemoCardConfig;

  @property() public showConfig = false;

  @state() private _size?: number;

  @query("#card") private _card!: HTMLElement;

  render() {
    return html`
      <h2>
        ${this.config.heading}
        ${this._size !== undefined
          ? html`<small>(size ${this._size})</small>`
          : ""}
      </h2>
      <div class="root">
        <div id="card"></div>
        ${this.showConfig ? html`<pre>${this.config.config.trim()}</pre>` : ""}
      </div>
    `;
  }

  updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("config")) {
      const card = this._card;
      while (card.lastChild) {
        card.removeChild(card.lastChild);
      }

      const el = this._createCardElement((load(this.config.config) as any)[0]);
      card.appendChild(el);
      this._getSize(el);
    }

    if (changedProps.has("hass")) {
      const card = this._card.lastChild;
      if (card) {
        (card as any).hass = this.hass;
      }
    }
  }

  async _getSize(el) {
    await customElements.whenDefined(el.localName);

    if (!("getCardSize" in el)) {
      this._size = undefined;
      return;
    }
    this._size = await el.getCardSize();
  }

  _createCardElement(cardConfig) {
    const element = createCardElement(cardConfig);
    if (this.hass) {
      element.hass = this.hass;
    }
    element.addEventListener(
      "ll-rebuild",
      (ev) => {
        ev.stopPropagation();
        this._rebuildCard(element, cardConfig);
      },
      { once: true }
    );
    return element;
  }

  _rebuildCard(cardElToReplace, config) {
    const newCardEl = this._createCardElement(config);
    cardElToReplace.parentElement.replaceChild(newCardEl, cardElToReplace);
  }

  static styles = css`
    .root {
      display: flex;
    }
    h2 {
      margin: 0 0 20px;
      color: var(--primary-color);
    }
    h2 small {
      font-size: 0.5em;
      color: var(--primary-text-color);
    }
    #card {
      max-width: 400px;
      width: 100vw;
    }
    pre {
      width: 400px;
      margin: 0 16px;
      overflow: auto;
      color: var(--primary-text-color);
    }
    @media only screen and (max-width: 800px) {
      .root {
        flex-direction: column;
      }
      pre {
        margin: 16px 0;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-card": DemoCard;
  }
}
