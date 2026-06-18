import { mdiClose, mdiViewGridPlus } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeEntityPickerDisplay } from "../../../../common/entity/compute_entity_name_display";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-button";
import "../../../../components/ha-combo-box-item";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-ripple";
import "../../../../components/ha-section-title";
import "../../../../components/ha-svg-icon";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import { haStyleScrollbar } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import {
  generateBadgeSuggestions,
  type BadgeSuggestions,
} from "../../badge-suggestions";
import type { BadgeSuggestion } from "../../badge-suggestions/types";
import "../card-editor/hui-suggestion-entity-tree";
import type { HuiSuggestionEntityTree } from "../card-editor/hui-suggestion-entity-tree";
import "./hui-suggestion-badge";

@customElement("hui-badge-suggestion-picker")
export class HuiBadgeSuggestionPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Array, attribute: false })
  public prioritizedBadgeTypes?: string[];

  @state() private _entityId?: string;

  @state() private _narrow = false;

  private _narrowMql?: MediaQueryList;

  @query("hui-suggestion-entity-tree")
  private _entityTree?: HuiSuggestionEntityTree;

  public async focus(): Promise<void> {
    await this.updateComplete;
    await this._entityTree?.focus();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._narrowMql = matchMedia("(max-width: 600px)");
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

  // Memoize on scalars so the result stays stable when only hass changes.
  // Keeps hui-badge previews from re-rendering on every state tick.
  private _computeSuggestions = memoizeOne(
    (
      entityId: string | undefined,
      priorityTypesKey: string
    ): BadgeSuggestions => {
      const { core, custom } = generateBadgeSuggestions(this.hass, entityId);
      const priorityTypes = priorityTypesKey
        ? priorityTypesKey.split("|")
        : undefined;
      if (!priorityTypes?.length) return { core, custom };
      const isPrioritized = (s: BadgeSuggestion) =>
        priorityTypes.includes(s.config.type);
      return {
        core: [
          ...core.filter(isPrioritized),
          ...core.filter((s) => !isPrioritized(s)),
        ],
        custom,
      };
    }
  );

  protected render() {
    const hasEntity = !!this._entityId;
    // Tree is rendered unconditionally so its state (filter, expanded
    // branches, fuse index) survives the desktop/mobile and tree/suggestions
    // switches.
    const showTree = !this._narrow || !hasEntity;
    const showMain = !this._narrow || hasEntity;
    return html`
      <div class=${classMap({ sidebar: true, hidden: !showTree })}>
        <hui-suggestion-entity-tree
          class="tree"
          .hass=${this.hass}
          .selectedEntityId=${this._entityId}
          @entity-picked=${this._handleEntityPicked}
        ></hui-suggestion-entity-tree>
      </div>
      <div class=${classMap({ main: true, hidden: !showMain })}>
        <div class="content ha-scrollbar">
          ${this._renderMainContent(hasEntity)}
        </div>
      </div>
    `;
  }

  private _renderMainContent(
    hasEntity: boolean
  ): TemplateResult | typeof nothing {
    if (!hasEntity) return this._renderEmptyState();
    const { core, custom } = this._suggestions();
    return html`
      ${this._narrow ? this._renderSelectedEntity() : nothing}
      <ha-section-title>
        ${this.hass.localize(
          "ui.panel.lovelace.editor.badge_picker.suggestions_title"
        )}
      </ha-section-title>
      ${this._renderSuggestionsGrid(core)}
      ${custom.length
        ? html`
            <ha-section-title>
              ${this.hass.localize(
                "ui.panel.lovelace.editor.badge_picker.community_title"
              )}
            </ha-section-title>
            ${this._renderSuggestionsGrid(custom)}
          `
        : nothing}
      ${this._renderBrowseBadge()}
    `;
  }

  private _renderBrowseBadge(): TemplateResult {
    return html`
      <div class="browse-badge">
        <p>
          ${this.hass.localize(
            "ui.panel.lovelace.editor.badge_picker.not_found"
          )}
        </p>
        <ha-button appearance="plain" @click=${this._browseBadges}>
          <ha-svg-icon slot="start" .path=${mdiViewGridPlus}></ha-svg-icon>
          ${this.hass.localize(
            "ui.panel.lovelace.editor.badge_picker.browse_badges"
          )}
        </ha-button>
      </div>
    `;
  }

  private _renderSelectedEntity(): TemplateResult {
    const stateObj = this.hass.states[this._entityId!];
    const { primary, secondary } = stateObj
      ? computeEntityPickerDisplay(this.hass, stateObj)
      : { primary: this._entityId!, secondary: undefined };
    return html`
      <ha-section-title>
        ${this.hass.localize(
          "ui.panel.lovelace.editor.badge_picker.selected_entity"
        )}
      </ha-section-title>
      <ha-combo-box-item compact class="selected-entity">
        ${stateObj
          ? html`<state-badge
              slot="start"
              .hass=${this.hass}
              .stateObj=${stateObj}
            ></state-badge>`
          : nothing}
        <span slot="headline">${primary}</span>
        ${secondary
          ? html`<span slot="supporting-text">${secondary}</span>`
          : nothing}
        <ha-icon-button
          slot="end"
          .label=${this.hass.localize("ui.common.clear")}
          .path=${mdiClose}
          @click=${this._clearEntity}
        ></ha-icon-button>
      </ha-combo-box-item>
    `;
  }

  private _renderEmptyState(): TemplateResult {
    return html`
      <div class="content-empty">
        <h2>
          ${this.hass.localize(
            "ui.panel.lovelace.editor.badge_picker.content_empty_title"
          )}
        </h2>
        <p>
          ${this.hass.localize(
            "ui.panel.lovelace.editor.badge_picker.content_empty_description"
          )}
        </p>
        <ha-button appearance="plain" @click=${this._browseBadges}>
          <ha-svg-icon slot="start" .path=${mdiViewGridPlus}></ha-svg-icon>
          ${this.hass.localize(
            "ui.panel.lovelace.editor.badge_picker.browse_badges"
          )}
        </ha-button>
      </div>
    `;
  }

  private _suggestionKeys = new WeakMap<BadgeSuggestion, string>();

  private _suggestionKey = (s: BadgeSuggestion): string => {
    let key = this._suggestionKeys.get(s);
    if (key === undefined) {
      key = JSON.stringify(s.config);
      this._suggestionKeys.set(s, key);
    }
    return key;
  };

  private _renderSuggestionsGrid(
    suggestions: BadgeSuggestion[]
  ): TemplateResult {
    return html`
      <div class="suggestions" @pick-badge-suggestion=${this._pickSuggestion}>
        ${repeat(
          suggestions,
          this._suggestionKey,
          (s: BadgeSuggestion) => html`
            <hui-suggestion-badge
              .hass=${this.hass}
              .suggestion=${s}
            ></hui-suggestion-badge>
          `
        )}
      </div>
    `;
  }

  private _suggestions(): BadgeSuggestions {
    return this._computeSuggestions(
      this._entityId,
      (this.prioritizedBadgeTypes ?? []).join("|")
    );
  }

  private _browseBadges(): void {
    fireEvent(this, "browse-badges", undefined);
  }

  private _handleEntityPicked(ev: CustomEvent<{ entityId: string }>): void {
    this._entityId = ev.detail.entityId;
  }

  private _clearEntity(): void {
    this._entityId = undefined;
  }

  private _pickSuggestion(
    ev: CustomEvent<{ suggestion: BadgeSuggestion }>
  ): void {
    fireEvent(this, "badge-suggestion-picked", {
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
          border-inline-end: var(--ha-border-width-sm) solid
            var(--divider-color);
          min-height: 0;
          overflow: hidden;
        }
        .tree {
          flex: 1;
          min-height: 0;
        }
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .content {
          flex: 1;
          min-height: 0;
          overflow: auto;
        }
        .hidden {
          display: none !important;
        }
        .suggestions {
          display: grid;
          gap: var(--ha-space-3);
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          padding: var(--ha-space-3);
        }
        .content-empty {
          box-sizing: border-box;
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
        .browse-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--ha-space-2);
          padding: var(--ha-space-6) var(--ha-space-4);
        }
        .browse-badge p {
          margin: 0;
          color: var(--ha-color-text-secondary);
          font-size: var(--ha-font-size-s);
        }

        /* Mobile master/detail: sidebar OR main is visible, never both. */
        @media (max-width: 600px) {
          :host {
            flex-direction: column;
            overflow: hidden;
          }
          .sidebar {
            flex: 1;
            border-inline-end: none;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-badge-suggestion-picker": HuiBadgeSuggestionPicker;
  }
  interface HASSDomEvents {
    "browse-badges": undefined;
    "badge-suggestion-picked": { config: LovelaceBadgeConfig };
  }
}
