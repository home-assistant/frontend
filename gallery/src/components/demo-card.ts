import { load } from "js-yaml";
import { LitElement, PropertyValueMap, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../src/panels/lovelace/cards/hui-card";
import type { HuiCard } from "../../../src/panels/lovelace/cards/hui-card";
import { HomeAssistant } from "../../../src/types";

export interface DemoCardConfig {
  heading: string;
  config: string;
}

@customElement("demo-card")
class DemoCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: DemoCardConfig;

  @property({ type: Boolean }) public showConfig = false;

  @state() private _size?: number;

  @query("hui-card", false) private _card?: HuiCard;

  private _config = memoizeOne((config: string) => {
    const c = (load(config) as any)[0];
    return c;
  });

  render() {
    return html`
      <h2>
        ${this.config.heading}
        ${this._size !== undefined
          ? html`<small>(size ${this._size})</small>`
          : ""}
      </h2>
      <div class="root">
        <hui-card
          .config=${this._config(this.config.config)}
          .hass=${this.hass}
          @card-updated=${this._cardUpdated}
        ></hui-card>
        ${this.showConfig
          ? html`<pre>${this.config.config.trim()}</pre>`
          : nothing}
      </div>
    `;
  }

  private async _cardUpdated(ev) {
    ev.stopPropagation();
    this._updateSize();
  }

  private async _updateSize() {
    this._size = await this._card?.getCardSize();
  }

  protected update(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.update(_changedProperties);
    this._updateSize();
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
    hui-card {
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
