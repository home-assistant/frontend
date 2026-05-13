import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-ripple";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { HomeAssistant } from "../../../../types";
import "../../cards/hui-card";
import type { CardSuggestion } from "../../card-suggestions/types";

declare global {
  interface HASSDomEvents {
    "pick-suggestion": { suggestion: CardSuggestion };
  }
}

const PREVIEW_ITEM_CAP = 6;

const getItemCount = (config: LovelaceCardConfig): number => {
  const c = config as { cards?: unknown[]; entities?: unknown[] };
  return c.cards?.length ?? c.entities?.length ?? 0;
};

// Truncates preview content so the card grid stays responsive — full content
// is restored when the suggestion is actually picked.
const cappedCardConfig = (config: LovelaceCardConfig): LovelaceCardConfig => {
  const c = config as { cards?: LovelaceCardConfig[]; entities?: unknown[] };
  if (c.cards && c.cards.length > PREVIEW_ITEM_CAP) {
    return { ...config, cards: c.cards.slice(0, PREVIEW_ITEM_CAP) };
  }
  if (c.entities && c.entities.length > PREVIEW_ITEM_CAP) {
    return { ...config, entities: c.entities.slice(0, PREVIEW_ITEM_CAP) };
  }
  return config;
};

@customElement("hui-suggestion-card")
export class HuiSuggestionCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public suggestion!: CardSuggestion;

  @state() private _preview?: LovelaceCardConfig;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!changedProps.has("suggestion")) {
      return;
    }
    this._preview = this.suggestion?.config
      ? cappedCardConfig(this.suggestion.config)
      : undefined;
  }

  protected render(): TemplateResult {
    const { suggestion } = this;
    const totalCount = getItemCount(suggestion.config);
    const hiddenCount = Math.max(0, totalCount - PREVIEW_ITEM_CAP);

    return html`
      <div
        class="card"
        tabindex="0"
        role="button"
        aria-label=${suggestion.label}
        @click=${this._handleClick}
        @keydown=${this._handleKeyDown}
      >
        <div class="card-header">${suggestion.label}</div>
        <div class="preview">
          ${this._preview
            ? html`
                <hui-card
                  .hass=${this.hass}
                  .config=${this._preview}
                  preview
                ></hui-card>
              `
            : nothing}
        </div>
        ${hiddenCount > 0
          ? html`
              <div class="more-badge">
                ${this.hass?.localize(
                  "ui.panel.lovelace.editor.cardpicker.more_cards",
                  { count: hiddenCount }
                )}
              </div>
            `
          : nothing}
        <ha-ripple></ha-ripple>
      </div>
    `;
  }

  private _handleClick(): void {
    fireEvent(this, "pick-suggestion", { suggestion: this.suggestion });
  }

  private _handleKeyDown(ev: KeyboardEvent): void {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._handleClick();
    }
  }

  static readonly styles: CSSResultGroup = css`
    :host {
      display: block;
      height: 100%;
    }
    .card {
      height: 100%;
      display: flex;
      flex-direction: column;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      background: var(--primary-background-color, #fafafa);
      cursor: pointer;
      position: relative;
      overflow: hidden;
      border: var(--ha-card-border-width, 1px) solid
        var(--ha-card-border-color, var(--divider-color));
    }
    .card:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .card-header {
      color: var(--ha-card-header-color, var(--primary-text-color));
      font-family: var(--ha-card-header-font-family, inherit);
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
      padding: var(--ha-space-3) var(--ha-space-4);
      text-align: center;
    }
    .preview {
      pointer-events: none;
      margin: var(--ha-space-4);
      flex-grow: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .preview > :first-child {
      display: block;
      width: 100%;
    }
    .more-badge {
      margin: 0 var(--ha-space-4) var(--ha-space-3);
      padding: var(--ha-space-1) var(--ha-space-2);
      align-self: flex-start;
      border-radius: var(--ha-border-radius-md);
      background: var(--ha-color-fill-neutral-quiet-resting);
      color: var(--ha-color-text-secondary);
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-medium);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-suggestion-card": HuiSuggestionCard;
  }
}
