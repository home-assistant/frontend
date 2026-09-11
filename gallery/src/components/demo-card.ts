import { dump } from "js-yaml";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../src/components/ha-alert";
import type { LovelaceCardConfig } from "../../../src/data/lovelace/config/card";
import "../../../src/panels/lovelace/cards/hui-card";
import type { HuiCard } from "../../../src/panels/lovelace/cards/hui-card";
import type { HomeAssistant } from "../../../src/types";
import { validateCardConfig } from "../common/validate-card-config";

export interface DemoCardConfig<
  T extends LovelaceCardConfig = LovelaceCardConfig,
> {
  heading: string;
  config: T;
  expectConfigError?: boolean;
}

@customElement("demo-card")
class DemoCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: DemoCardConfig;

  @property({ attribute: "show-config", type: Boolean })
  public showConfig = false;

  @state() private _size?: number;

  @state() private _configError?: string;

  @query("hui-card", false) private _card?: HuiCard;

  private _yamlConfig = memoizeOne((config: LovelaceCardConfig) =>
    dump([config]).trim()
  );

  protected async firstUpdated() {
    try {
      await validateCardConfig(this.config.config);
    } catch (err) {
      if (this.config.expectConfigError) {
        return;
      }
      this._configError = err instanceof Error ? err.message : String(err);
      return;
    }

    if (this.config.expectConfigError) {
      this._configError = `Expected config error for ${this.config.heading}`;
    }
  }

  render() {
    return html`
      <h2>
        ${this.config.heading}
        ${
          this._size !== undefined
            ? html`<small>(size ${this._size})</small>`
            : ""
        }
      </h2>
      ${
        this._configError
          ? html`<ha-alert alert-type="error">${this._configError}</ha-alert>`
          : nothing
      }
      <div class="root">
        <hui-card
          .config=${this.config.config}
          .hass=${this.hass}
          @card-updated=${this._cardUpdated}
        ></hui-card>
        ${
          this.showConfig
            ? html`<pre>${this._yamlConfig(this.config.config)}</pre>`
            : nothing
        }
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

  protected update(_changedProperties: PropertyValues<this>): void {
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
    ha-alert {
      margin-bottom: 16px;
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
