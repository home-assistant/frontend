import { mdiClose, mdiViewGridPlus } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-ripple";
import "../../../../components/ha-svg-icon";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import { domainToName } from "../../../../data/integration";
import { haStyleScrollbar } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { CardSuggestion } from "../../card-suggestions/types";
import { generateCardSuggestions } from "../../common/card-suggestions";
import { PREVIEW_ITEM_CAP } from "./hui-recipe-preview";

declare global {
  interface HASSDomEvents {
    "recipe-cards-picked": { cards: LovelaceCardConfig[] };
    "recipe-browse-cards": undefined;
  }
}

const getItemCount = (config: LovelaceCardConfig): number => {
  const c = config as { cards?: unknown[]; entities?: unknown[] };
  return c.cards?.length ?? c.entities?.length ?? 0;
};

@customElement("hui-recipe-picker")
export class HuiRecipePicker extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean, attribute: "in-section" })
  public inSection = false;

  @property({ type: Array, attribute: false })
  public prioritizedCardTypes?: string[];

  @state() private _entityIds: string[] = [];

  // Keyed on string args (not hass) so preview elements stay stable across
  // hass updates — see `hui-recipe-preview` which rebuilds only on config
  // change.
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

    if (this._entityIds.length === 0) {
      return this._renderEmptyState();
    }

    const suggestions = this._computeSuggestions(
      this._entityIds.join("|"),
      (this.prioritizedCardTypes ?? []).join("|")
    );

    return html`
      <div class="sidebar ha-scrollbar">
        <ha-md-list>
          ${repeat(
            this._entityIds,
            (id: string) => id,
            (id: string) => this._renderEntityRow(id)
          )}
        </ha-md-list>
        <div class="add-row">
          <ha-entity-picker
            .hass=${this.hass}
            add-button
            .excludeEntities=${this._entityIds}
            @value-changed=${this._entityPickerValueChanged}
          ></ha-entity-picker>
        </div>
      </div>
      <div class="content ha-scrollbar">
        <div class="recipes">
          ${repeat(
            suggestions,
            (s) => s.id,
            (s) => this._renderSuggestionCard(s)
          )}
        </div>
      </div>
    `;
  }

  private _renderEmptyState(): TemplateResult {
    return html`
      <div class="empty-state">
        <div class="empty-state-inner">
          <h2>
            ${this.hass!.localize(
              "ui.panel.lovelace.editor.cardpicker.empty_title"
            )}
          </h2>
          <p>
            ${this.hass!.localize(
              "ui.panel.lovelace.editor.cardpicker.empty_description"
            )}
          </p>
          <div class="empty-state-actions">
            <ha-entity-picker
              .hass=${this.hass}
              add-button
              .excludeEntities=${this._entityIds}
              @value-changed=${this._entityPickerValueChanged}
            ></ha-entity-picker>
            <ha-button appearance="plain" @click=${this._browseCards}>
              <ha-svg-icon slot="start" .path=${mdiViewGridPlus}></ha-svg-icon>
              ${this.hass!.localize(
                "ui.panel.lovelace.editor.cardpicker.browse_cards"
              )}
            </ha-button>
          </div>
        </div>
      </div>
    `;
  }

  private _browseCards(): void {
    fireEvent(this, "recipe-browse-cards", undefined);
  }

  private _renderEntityRow(entityId: string): TemplateResult {
    const stateObj = this.hass!.states[entityId];
    const entity = this.hass!.entities[entityId];
    const device = entity?.device_id
      ? this.hass!.devices[entity.device_id]
      : undefined;
    const areaId = entity?.area_id ?? device?.area_id;
    const area = areaId ? this.hass!.areas[areaId] : undefined;

    const name = stateObj ? computeStateName(stateObj) : entityId;
    const supporting =
      (area ? computeAreaName(area) : undefined) ??
      (device ? computeDeviceName(device) : undefined) ??
      domainToName(this.hass!.localize, computeDomain(entityId));

    return html`
      <ha-md-list-item type="text" class="entity-row">
        ${stateObj
          ? html`<state-badge
              slot="start"
              .hass=${this.hass}
              .stateObj=${stateObj}
            ></state-badge>`
          : nothing}
        <div slot="headline">${name}</div>
        <div slot="supporting-text">${supporting}</div>
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

  private _renderSuggestionCard(suggestion: CardSuggestion): TemplateResult {
    const totalCount = getItemCount(suggestion.config);
    const hiddenCount = Math.max(0, totalCount - PREVIEW_ITEM_CAP);
    return html`
      <div class="card" tabindex="0">
        <div
          class="overlay"
          role="button"
          aria-label=${suggestion.label}
          @click=${this._suggestionPicked}
          .suggestion=${suggestion}
        ></div>
        <div class="card-header">${suggestion.label}</div>
        <div class="preview">
          <hui-recipe-preview
            .hass=${this.hass}
            .config=${suggestion.config}
          ></hui-recipe-preview>
        </div>
        ${hiddenCount > 0
          ? html`
              <div class="more-badge">
                ${this.hass!.localize(
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

  private _suggestionPicked(ev: MouseEvent): void {
    const suggestion: CardSuggestion = (
      ev.currentTarget as HTMLElement & { suggestion: CardSuggestion }
    ).suggestion;
    const config = suggestion.config;
    const wrapper = config as { type: string; cards?: LovelaceCardConfig[] };
    if (this.inSection && wrapper.type === "grid" && wrapper.cards?.length) {
      fireEvent(this, "recipe-cards-picked", { cards: wrapper.cards });
      return;
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
        .empty-state {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--ha-space-8) var(--ha-space-4);
          text-align: center;
        }
        .empty-state-inner {
          max-width: 480px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--ha-space-3);
        }
        .empty-state h2 {
          margin: 0;
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-medium);
        }
        .empty-state p {
          margin: 0;
          color: var(--ha-color-text-secondary);
          line-height: var(--ha-line-height-expanded);
        }
        .empty-state-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: var(--ha-space-2);
          margin-top: var(--ha-space-4);
        }
        .empty-state-actions ha-entity-picker {
          --ha-generic-picker-min-width: 420px;
          --ha-generic-picker-max-width: 480px;
        }
        .sidebar {
          flex: 0 0 320px;
          display: flex;
          flex-direction: column;
          border-inline-end: 1px solid var(--divider-color);
          overflow: auto;
        }
        ha-md-list {
          padding: var(--ha-space-2) 0;
        }
        .entity-row {
          --md-list-item-leading-space: var(--ha-space-3);
          --md-list-item-trailing-space: var(--ha-space-1);
        }
        .add-row {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          padding: var(--ha-space-2) var(--ha-space-3);
          border-top: 1px solid var(--divider-color);
        }
        .add-row ha-entity-picker {
          flex: 1;
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
        .card {
          height: 100%;
          display: flex;
          flex-direction: column;
          border-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
          background: var(--primary-background-color, #fafafa);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          border: var(--ha-card-border-width, 1px) solid
            var(--ha-card-border-color, var(--divider-color));
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
        .overlay {
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: 1;
          box-sizing: border-box;
          border-radius: var(
            --ha-card-border-radius,
            var(--ha-border-radius-lg)
          );
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
