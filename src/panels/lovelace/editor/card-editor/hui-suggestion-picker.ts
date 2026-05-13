import { mdiViewGridPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-ripple";
import "../../../../components/ha-svg-icon";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import { haStyleScrollbar } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { generateCardSuggestions } from "../../card-suggestions";
import type { CardSuggestion } from "../../card-suggestions/types";
import "./hui-suggestion-card";
import "./hui-suggestion-entity-tree";

declare global {
  interface HASSDomEvents {
    "browse-cards": undefined;
    "suggestion-picked": { config: LovelaceCardConfig };
  }
}

@customElement("hui-suggestion-picker")
export class HuiSuggestionPicker extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Array, attribute: false })
  public prioritizedCardTypes?: string[];

  @state() private _entityId?: string;

  @state() private _narrow = false;

  private _narrowMql?: MediaQueryList;

  public connectedCallback(): void {
    super.connectedCallback();
    this._narrowMql = matchMedia("(max-width: 700px)");
    this._narrow = this._narrowMql.matches;
    this._narrowMql.addEventListener("change", this._handleNarrowChange);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._narrowMql?.removeEventListener("change", this._handleNarrowChange);
    this._narrowMql = undefined;
  }

  private _handleNarrowChange = (ev: MediaQueryListEvent) => {
    this._narrow = ev.matches;
  };

  // Memoize on scalars so the result stays stable when only hass changes —
  // keeps hui-card previews from re-rendering on every state tick.
  private _computeSuggestions = memoizeOne(
    (
      entityId: string | undefined,
      priorityTypesKey: string
    ): CardSuggestion[] => {
      if (!this.hass) return [];
      const suggestions = generateCardSuggestions(this.hass, entityId);
      const priorityTypes = priorityTypesKey
        ? priorityTypesKey.split("|")
        : undefined;
      if (!priorityTypes?.length) return suggestions;
      const isPrioritized = (s: CardSuggestion) =>
        priorityTypes.includes(s.config.type);
      return [
        ...suggestions.filter(isPrioritized),
        ...suggestions.filter((s) => !isPrioritized(s)),
      ];
    }
  );

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const suggestions = this._computeSuggestions(
      this._entityId,
      (this.prioritizedCardTypes ?? []).join("|")
    );
    const excludeEntities = this._entityId ? [this._entityId] : undefined;

    return html`
      <div class="sidebar">
        ${this._narrow
          ? html`
              <div class="add-row">
                <ha-entity-picker
                  .hass=${this.hass}
                  add-button
                  .excludeEntities=${excludeEntities}
                  @value-changed=${this._entityPickerValueChanged}
                ></ha-entity-picker>
              </div>
            `
          : html`
              <hui-suggestion-entity-tree
                class="tree"
                .hass=${this.hass}
                .selectedEntityIds=${this._entityId ? [this._entityId] : []}
                @entity-picked=${this._handleEntityPicked}
              ></hui-suggestion-entity-tree>
            `}
      </div>
      <div class="content ha-scrollbar">
        ${!this._entityId
          ? html`
              <div class="content-empty">
                <h2>
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.cardpicker.content_empty_title"
                  )}
                </h2>
                <p>
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.cardpicker.content_empty_description"
                  )}
                </p>
                <ha-button appearance="plain" @click=${this._browseCards}>
                  <ha-svg-icon
                    slot="start"
                    .path=${mdiViewGridPlus}
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.cardpicker.browse_cards"
                  )}
                </ha-button>
              </div>
            `
          : html`
              <div class="suggestions" @pick-suggestion=${this._pickSuggestion}>
                ${repeat(
                  suggestions,
                  (s: CardSuggestion) => s.id,
                  (s: CardSuggestion) => html`
                    <hui-suggestion-card
                      .hass=${this.hass}
                      .suggestion=${s}
                    ></hui-suggestion-card>
                  `
                )}
                <div
                  class="browse-card"
                  tabindex="0"
                  role="button"
                  aria-label=${this.hass.localize(
                    "ui.panel.lovelace.editor.cardpicker.browse_cards"
                  )}
                  @click=${this._browseCards}
                  @keydown=${this._browseCardsKeydown}
                >
                  <ha-svg-icon .path=${mdiViewGridPlus}></ha-svg-icon>
                  <span class="browse-card-title">
                    ${this.hass.localize(
                      "ui.panel.lovelace.editor.cardpicker.browse_cards"
                    )}
                  </span>
                  <p>
                    ${this.hass.localize(
                      "ui.panel.lovelace.editor.cardpicker.not_found"
                    )}
                  </p>
                  <ha-ripple></ha-ripple>
                </div>
              </div>
            `}
      </div>
    `;
  }

  private _browseCards(): void {
    fireEvent(this, "browse-cards", undefined);
  }

  private _browseCardsKeydown(ev: KeyboardEvent): void {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      this._browseCards();
    }
  }

  private _handleEntityPicked(ev: CustomEvent<{ entityId: string }>): void {
    this._entityId = ev.detail.entityId;
  }

  private _entityPickerValueChanged(ev: CustomEvent<{ value: string }>): void {
    const value = ev.detail.value;
    if (!value) {
      return;
    }
    this._entityId = value;
  }

  private _pickSuggestion(
    ev: CustomEvent<{ suggestion: CardSuggestion }>
  ): void {
    fireEvent(this, "suggestion-picked", {
      config: ev.detail.suggestion.config,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleScrollbar,
      css`
        :host {
          display: flex;
          flex-direction: row;
          min-height: 0;
        }

        .sidebar {
          flex: 0 0 320px;
          display: flex;
          flex-direction: column;
          border-inline-end: 1px solid var(--divider-color);
          min-height: 0;
          overflow: hidden;
        }
        .tree {
          flex: 1;
          min-height: 0;
        }
        .add-row {
          display: flex;
          align-items: center;
          padding: var(--ha-space-2) var(--ha-space-3);
        }
        .add-row ha-entity-picker {
          flex: 1;
          --ha-generic-picker-min-width: 0;
          --ha-generic-picker-max-width: none;
        }
        .content {
          flex: 1;
          min-height: 0;
          overflow: auto;
        }
        .suggestions {
          display: grid;
          gap: var(--ha-space-3);
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          padding: var(--ha-space-3);
        }
        .content-empty {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--ha-space-3);
          padding: var(--ha-space-8) var(--ha-space-4);
          text-align: center;
        }
        .content-empty h2 {
          margin: 0;
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-medium);
        }
        .content-empty p {
          margin: 0;
          max-width: 480px;
          color: var(--ha-color-text-secondary);
          line-height: var(--ha-line-height-expanded);
        }
        .browse-card {
          position: relative;
          box-sizing: border-box;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--ha-space-2);
          padding: var(--ha-space-6);
          text-align: center;
          cursor: pointer;
          overflow: hidden;
          border-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
          border: var(--ha-card-border-width, 1px) dashed
            var(--ha-card-border-color, var(--divider-color));
          background: var(--primary-background-color, #fafafa);
          color: var(--primary-text-color);
        }
        .browse-card:focus-visible {
          outline: 2px solid var(--primary-color);
          outline-offset: 2px;
        }
        .browse-card ha-svg-icon {
          color: var(--ha-color-text-secondary);
        }
        .browse-card-title {
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
        }
        .browse-card p {
          margin: 0;
          color: var(--ha-color-text-secondary);
          font-size: var(--ha-font-size-s);
        }

        @media (max-width: 700px) {
          :host {
            flex-direction: column;
            overflow-y: auto;
          }
          .sidebar,
          .content {
            flex: 0 0 auto;
            overflow: visible;
          }
          .sidebar {
            border-inline-end: none;
            border-bottom: 1px solid var(--divider-color);
          }
          .tree {
            min-height: 320px;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-suggestion-picker": HuiSuggestionPicker;
  }
}
