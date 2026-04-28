import { mdiClose, mdiViewGridPlus } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeEntityPickerDisplay } from "../../../../common/entity/compute_entity_name_display";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-ripple";
import "../../../../components/ha-section-title";
import "../../../../components/ha-svg-icon";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../../data/lovelace/config/section";
import { haStyleScrollbar } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { CardSuggestion } from "../../card-suggestions/types";
import { generateCardSuggestions } from "../../common/card-suggestions";
import "./hui-recipe-entity-tree";
import "./hui-recipe-suggestion";

declare global {
  interface HASSDomEvents {
    "recipe-cards-picked": { cards: LovelaceCardConfig[] };
    "recipe-browse-cards": undefined;
  }
}

@customElement("hui-recipe-picker")
export class HuiRecipePicker extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false })
  public sectionConfig?: LovelaceSectionConfig;

  @property({ type: Array, attribute: false })
  public prioritizedCardTypes?: string[];

  @state() private _entityIds: string[] = [];

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

  // Keyed on string args (not hass) so preview elements stay stable across
  // hass updates.
  private _computeSuggestions = memoizeOne(
    (entityIdsKey: string, priorityTypesKey: string): CardSuggestion[] => {
      const entityIds = entityIdsKey ? entityIdsKey.split("|") : [];
      const priorityTypes = priorityTypesKey
        ? priorityTypesKey.split("|")
        : undefined;
      if (!this.hass) return [];
      const suggestions = generateCardSuggestions(this.hass, entityIds);
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
      this._entityIds.join("|"),
      (this.prioritizedCardTypes ?? []).join("|")
    );

    return html`
      <div class="sidebar">
        <ha-section-title>
          ${this.hass.localize(
            "ui.panel.lovelace.editor.cardpicker.selected_section"
          )}
        </ha-section-title>
        <div class="selected-list-container">
          ${this._entityIds.length
            ? html`
                <ha-md-list class="selected-list ha-scrollbar">
                  ${repeat(
                    this._entityIds,
                    (id: string) => id,
                    (id: string) => this._renderEntityRow(id)
                  )}
                </ha-md-list>
              `
            : html`
                <div class="selected-empty">
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.cardpicker.sidebar_empty"
                  )}
                </div>
              `}
        </div>
        <ha-section-title>
          ${this.hass.localize(
            "ui.panel.lovelace.editor.cardpicker.browse_section"
          )}
        </ha-section-title>
        ${this._narrow
          ? html`
              <div class="add-row">
                <ha-entity-picker
                  .hass=${this.hass}
                  add-button
                  .excludeEntities=${this._entityIds}
                  @value-changed=${this._entityPickerValueChanged}
                ></ha-entity-picker>
              </div>
            `
          : html`
              <hui-recipe-entity-tree
                class="tree"
                .hass=${this.hass}
                .selectedEntityIds=${this._entityIds}
                @entity-toggled=${this._handleEntityToggled}
              ></hui-recipe-entity-tree>
            `}
      </div>
      <div class="content ha-scrollbar">
        ${this._entityIds.length === 0
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
              <div class="recipes" @suggestion-picked=${this._suggestionPicked}>
                ${repeat(
                  suggestions,
                  (s: CardSuggestion) => s.id,
                  (s: CardSuggestion) => html`
                    <hui-recipe-suggestion
                      .hass=${this.hass}
                      .suggestion=${s}
                      .sectionConfig=${this.sectionConfig}
                    ></hui-recipe-suggestion>
                  `
                )}
                <div
                  class="browse-card"
                  tabindex="0"
                  role="button"
                  @click=${this._browseCards}
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

  private _renderEntityRow(entityId: string): TemplateResult {
    const stateObj = this.hass!.states[entityId];
    const display = stateObj
      ? computeEntityPickerDisplay(this.hass!, stateObj)
      : { primary: entityId, secondary: undefined };

    return html`
      <ha-md-list-item type="text" class="entity-row">
        ${stateObj
          ? html`<state-badge
              slot="start"
              .hass=${this.hass}
              .stateObj=${stateObj}
            ></state-badge>`
          : nothing}
        <div slot="headline">${display.primary}</div>
        ${display.secondary
          ? html`<div slot="supporting-text">${display.secondary}</div>`
          : nothing}
        <ha-icon-button
          slot="end"
          .path=${mdiClose}
          .label=${this.hass!.localize("ui.common.remove")}
          .entityId=${entityId}
          @click=${this._removeEntity}
        ></ha-icon-button>
      </ha-md-list-item>
    `;
  }

  private _browseCards(): void {
    fireEvent(this, "recipe-browse-cards", undefined);
  }

  private _handleEntityToggled(ev: CustomEvent<{ entityId: string }>): void {
    const id = ev.detail.entityId;
    if (this._entityIds.includes(id)) {
      this._entityIds = this._entityIds.filter((e) => e !== id);
    } else {
      this._entityIds = [...this._entityIds, id];
    }
  }

  private _entityPickerValueChanged(ev: CustomEvent<{ value: string }>): void {
    const value = ev.detail.value;
    if (!value || this._entityIds.includes(value)) {
      return;
    }
    this._entityIds = [...this._entityIds, value];
  }

  private _removeEntity(ev: MouseEvent): void {
    ev.stopPropagation();
    const target = ev.currentTarget as HTMLElement & { entityId: string };
    this._entityIds = this._entityIds.filter((id) => id !== target.entityId);
  }

  private _suggestionPicked(
    ev: CustomEvent<{ suggestion: CardSuggestion }>
  ): void {
    const { suggestion } = ev.detail;
    const config = suggestion.config;
    if (this.sectionConfig && suggestion.flattenInSection) {
      const cards = config.cards as LovelaceCardConfig[] | undefined;
      if (cards?.length) {
        fireEvent(this, "recipe-cards-picked", { cards });
        return;
      }
    }
    fireEvent(this, "config-changed", { config });
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
        .selected-list-container {
          flex: 0 0 30%;
          min-height: 120px;
          max-height: 240px;
          display: flex;
          flex-direction: column;
        }
        .selected-list {
          padding: var(--ha-space-2) 0;
          flex: 1;
          overflow: auto;
        }
        .selected-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--ha-space-4);
          text-align: center;
          color: var(--ha-color-text-secondary);
          font-size: var(--ha-font-size-s);
          line-height: var(--ha-line-height-expanded);
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
        .entity-row {
          --md-list-item-leading-space: var(--ha-space-3);
          --md-list-item-trailing-space: var(--ha-space-1);
          --md-list-item-two-line-container-height: 48px;
          --md-list-item-top-space: var(--ha-space-1);
          --md-list-item-bottom-space: var(--ha-space-1);
        }
        .entity-row [slot="headline"],
        .entity-row [slot="supporting-text"] {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .content {
          flex: 1;
          min-height: 0;
          overflow: auto;
        }
        .recipes {
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
          .selected-list {
            max-height: none;
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
    "hui-recipe-picker": HuiRecipePicker;
  }
}
