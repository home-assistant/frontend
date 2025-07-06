import { LitElement, css, html, nothing } from "lit";
import { property, state } from "lit/decorators";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import "./hui-card";
import type { HuiCard } from "./hui-card";
import type { StackCardConfig } from "./types";

export abstract class HuiStackCard<T extends StackCardConfig = StackCardConfig>
  extends LitElement
  implements LovelaceCard
{
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-stack-card-editor");
    return document.createElement("hui-stack-card-editor");
  }

  public static getStubConfig(): Record<string, unknown> {
    return { cards: [] };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public preview = false;

  @state() protected _cards?: HuiCard[];

  @state() protected _config?: T;

  @property({ attribute: false }) public layout?: string;

  public getCardSize(): number | Promise<number> {
    return 1;
  }

  public setConfig(config: T): void {
    if (!config || !config.cards || !Array.isArray(config.cards)) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
    this._cards = config.cards.map((card) => {
      const element = this._createCardElement(card);
      return element;
    });
  }

  protected update(changedProperties) {
    super.update(changedProperties);

    if (this._cards) {
      if (changedProperties.has("hass")) {
        this._cards.forEach((card) => {
          card.hass = this.hass;
        });
      }
      if (changedProperties.has("preview")) {
        this._cards.forEach((card) => {
          card.preview = this.preview;
        });
      }
    }

    if (changedProperties.has("layout")) {
      this.toggleAttribute("ispanel", this.layout === "panel");
    }
  }

  private _createCardElement(cardConfig: LovelaceCardConfig) {
    const element = document.createElement("hui-card");
    element.hass = this.hass;
    element.preview = this.preview;
    element.config = cardConfig;
    element.load();
    return element;
  }

  protected render() {
    if (!this._config || !this._cards) {
      return nothing;
    }

    return html`
      ${this._config.title
        ? html`<h1 class="card-header">${this._config.title}</h1>`
        : ""}
      <div id="root" dir=${this.hass ? computeRTLDirection(this.hass) : "ltr"}>
        ${this._cards}
      </div>
    `;
  }

  static sharedStyles = css`
    .card-header {
      color: var(--ha-card-header-color, var(--primary-text-color));
      text-align: var(--ha-stack-title-text-align, start);
      font-family: var(--ha-card-header-font-family, inherit);
      font-size: var(--ha-card-header-font-size, var(--ha-font-size-2xl));
      font-weight: var(--ha-font-weight-normal);
      margin-block-start: 0px;
      margin-block-end: 0px;
      letter-spacing: -0.012em;
      line-height: var(--ha-line-height-condensed);
      display: block;
      padding: 24px 16px 16px;
    }
    :host([ispanel]) #root {
      --ha-card-border-radius: var(--restore-card-border-radius);
      --ha-card-border-width: var(--restore-card-border-width);
      --ha-card-box-shadow: var(--restore-card-box-shadow);
    }
  `;
}
