import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-ripple";
import {
  getCustomBadgeEntry,
  isCustomType,
  stripCustomPrefix,
} from "../../../../data/lovelace_custom_cards";
import type { HomeAssistant } from "../../../../types";
import type { BadgeSuggestion } from "../../badge-suggestions/types";
import "../../badges/hui-badge";

@customElement("hui-suggestion-badge")
export class HuiSuggestionBadge extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public suggestion!: BadgeSuggestion;

  protected render(): TemplateResult {
    const { suggestion } = this;
    const type = suggestion.config.type;
    let badgeName: string;
    if (isCustomType(type)) {
      const customType = stripCustomPrefix(type);
      badgeName = getCustomBadgeEntry(customType)?.name ?? customType;
    } else {
      badgeName =
        this.hass.localize(
          `ui.panel.lovelace.editor.badge.${type}.name` as any
        ) || type;
    }
    const label = suggestion.label
      ? `${badgeName} - ${suggestion.label}`
      : badgeName;

    return html`
      <div
        class="badge"
        tabindex="0"
        role="button"
        aria-label=${label}
        @keydown=${this._handleKeyDown}
      >
        <div class="overlay" @click=${this._handleClick}></div>
        <div class="badge-header">${label}</div>
        <div class="preview">
          <hui-badge
            .hass=${this.hass}
            .config=${suggestion.config}
            preview
          ></hui-badge>
        </div>
        <ha-ripple></ha-ripple>
      </div>
    `;
  }

  private _handleClick(): void {
    fireEvent(this, "pick-badge-suggestion", { suggestion: this.suggestion });
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
    .badge {
      height: 100%;
      display: flex;
      flex-direction: column;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      background: var(--primary-background-color);
      cursor: pointer;
      position: relative;
      overflow: hidden;
      border: var(--ha-card-border-width, var(--ha-border-width-sm)) solid
        var(--ha-card-border-color, var(--divider-color));
    }
    .badge:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .overlay {
      position: absolute;
      inset: 0;
      z-index: 1;
      border-radius: inherit;
    }
    .badge-header {
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-suggestion-badge": HuiSuggestionBadge;
  }
  interface HASSDomEvents {
    "pick-badge-suggestion": { suggestion: BadgeSuggestion };
  }
}
