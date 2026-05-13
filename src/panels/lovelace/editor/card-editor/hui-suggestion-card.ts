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

interface PreviewState {
  config: LovelaceCardConfig;
  hiddenCount: number;
}

const buildPreview = (config: LovelaceCardConfig): PreviewState => {
  const c = config as LovelaceCardConfig & {
    cards?: LovelaceCardConfig[];
    entities?: unknown[];
  };
  const items = c.cards ?? c.entities;
  if (!items || items.length <= PREVIEW_ITEM_CAP) {
    return { config, hiddenCount: 0 };
  }
  const slice = items.slice(0, PREVIEW_ITEM_CAP);
  const truncated = c.cards
    ? { ...config, cards: slice }
    : { ...config, entities: slice };
  return { config: truncated, hiddenCount: items.length - PREVIEW_ITEM_CAP };
};

@customElement("hui-suggestion-card")
export class HuiSuggestionCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public suggestion!: CardSuggestion;

  @state() private _preview?: PreviewState;

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (!changedProps.has("suggestion")) {
      return;
    }
    this._preview = this.suggestion?.config
      ? buildPreview(this.suggestion.config)
      : undefined;
  }

  protected render(): TemplateResult {
    const { suggestion } = this;
    const hiddenCount = this._preview?.hiddenCount ?? 0;

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
                  .config=${this._preview.config}
                  preview
                ></hui-card>
              `
            : nothing}
        </div>
        ${hiddenCount > 0
          ? html`
              <div class="more-badge">
                ${this.hass.localize(
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
