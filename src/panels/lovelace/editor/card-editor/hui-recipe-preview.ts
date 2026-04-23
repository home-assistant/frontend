import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../../types";
import { tryCreateCardElement } from "../../create-element/create-card-element";
import type { LovelaceCard } from "../../types";

export const PREVIEW_ITEM_CAP = 6;

const cappedConfig = (config: LovelaceCardConfig): LovelaceCardConfig => {
  const c = config as { cards?: LovelaceCardConfig[]; entities?: unknown[] };
  if (c.cards && c.cards.length > PREVIEW_ITEM_CAP) {
    return { ...config, cards: c.cards.slice(0, PREVIEW_ITEM_CAP) };
  }
  if (c.entities && c.entities.length > PREVIEW_ITEM_CAP) {
    return { ...config, entities: c.entities.slice(0, PREVIEW_ITEM_CAP) };
  }
  return config;
};

@customElement("hui-recipe-preview")
export class HuiRecipePreview extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public config?: LovelaceCardConfig;

  @state() private _element?: LovelaceCard;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("config")) {
      this._buildElement();
    } else if (changedProps.has("hass") && this._element) {
      this._element.hass = this.hass;
    }
  }

  protected render(): TemplateResult {
    return html`${this._element ?? nothing}`;
  }

  static readonly styles: CSSResultGroup = css`
    :host {
      display: block;
      width: 100%;
    }
  `;

  private _buildElement(): void {
    if (!this.config) {
      this._element = undefined;
      return;
    }
    try {
      const element = tryCreateCardElement(
        cappedConfig(this.config)
      ) as LovelaceCard;
      element.hass = this.hass;
      element.tabIndex = -1;
      element.addEventListener(
        "ll-rebuild",
        (ev) => {
          ev.stopPropagation();
          this._buildElement();
        },
        { once: true }
      );
      this._element = element;
    } catch {
      this._element = undefined;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-recipe-preview": HuiRecipePreview;
  }
}
