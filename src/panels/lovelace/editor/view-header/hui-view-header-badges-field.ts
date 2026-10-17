import { mdiPlus } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/chips/ha-assist-chip";
import "../../../../components/chips/ha-chip-set";
import "../../../../components/chips/ha-input-chip";
import "../../../../components/ha-button";
import "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-sortable";
import "../../../../components/ha-state-icon";
import "../../../../components/ha-svg-icon";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import { ensureBadgeConfig } from "../../../../data/lovelace/config/badge";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { HomeAssistant } from "../../../../types";
import type { ConfigChangedEvent } from "../hui-element-editor";
import "../badge-editor/hui-badge-element-editor";

declare global {
  interface HASSDomEvents {
    "badges-changed": { badges: LovelaceBadgeConfig[] };
  }
}

// Common badge types to surface as suggestions, in priority order. Each is the
// first matching entity found in the user's own instance, so the list reflects
// what they actually have. `deviceClass` narrows a domain (e.g. temperature).
const SUGGESTION_SPECS: {
  domain: string;
  deviceClass?: string;
}[] = [
  { domain: "weather" },
  { domain: "person" },
  { domain: "sensor", deviceClass: "temperature" },
  { domain: "sun" },
  { domain: "alarm_control_panel" },
  { domain: "lock" },
  { domain: "sensor", deviceClass: "battery" },
  { domain: "binary_sensor" },
  { domain: "media_player" },
  { domain: "climate" },
];

@customElement("hui-view-header-badges-field")
export class HuiViewHeaderBadgesField extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelaceConfig!: LovelaceConfig;

  @property({ attribute: false }) public badges: LovelaceBadgeConfig[] = [];

  // The "Add badge" panel is open.
  @state() private _adding = false;

  // Index of the badge currently being configured, if any.
  @state() private _editingIndex?: number;

  // Stable keys per badge config object so drag-reorder doesn't make the chips
  // jump (index keys fight the drag library).
  private _badgeIds = new WeakMap<LovelaceBadgeConfig, number>();

  private _nextBadgeId = 0;

  private _badgeKey(badge: LovelaceBadgeConfig): number {
    let id = this._badgeIds.get(badge);
    if (id === undefined) {
      id = this._nextBadgeId++;
      this._badgeIds.set(badge, id);
    }
    return id;
  }

  private _emit(badges: LovelaceBadgeConfig[]): void {
    fireEvent(this, "badges-changed", { badges });
  }

  private _badgeLabel(badge: LovelaceBadgeConfig): string {
    const entity = badge.entity as string | undefined;
    if (entity) {
      const stateObj = this.hass.states[entity];
      return stateObj ? computeStateName(stateObj) : entity;
    }
    return badge.type ?? "badge";
  }

  private _suggestions(): { entity: string; name: string }[] {
    const used = new Set(
      this.badges
        .map((badge) => badge.entity as string | undefined)
        .filter(Boolean)
    );
    const suggestions: { entity: string; name: string }[] = [];
    const seen = new Set<string>();
    for (const spec of SUGGESTION_SPECS) {
      const match = Object.keys(this.hass.states).find((entityId) => {
        if (used.has(entityId) || seen.has(entityId)) {
          return false;
        }
        if (computeDomain(entityId) !== spec.domain) {
          return false;
        }
        if (
          spec.deviceClass &&
          this.hass.states[entityId].attributes.device_class !==
            spec.deviceClass
        ) {
          return false;
        }
        return true;
      });
      if (match) {
        seen.add(match);
        suggestions.push({
          entity: match,
          name: computeStateName(this.hass.states[match]),
        });
      }
    }
    return suggestions;
  }

  // ---- add flow -------------------------------------------------------------

  private _toggleAdd(ev: Event): void {
    ev.stopPropagation();
    this._adding = !this._adding;
  }

  private _addEntity(entityId: string): void {
    if (!entityId) {
      return;
    }
    const badge = ensureBadgeConfig({ type: "entity", entity: entityId });
    this._adding = false;
    this._emit([...this.badges, badge]);
  }

  private _suggestionClicked(ev: Event): void {
    const entityId = (ev.currentTarget as HTMLElement).dataset.entity!;
    this._addEntity(entityId);
  }

  private _entityPicked(ev: CustomEvent): void {
    ev.stopPropagation();
    const entityId = ev.detail.value as string;
    this._addEntity(entityId);
  }

  // ---- chip list ------------------------------------------------------------

  private _chipClicked(ev: Event): void {
    ev.stopPropagation();
    const idx = parseInt(
      (ev.currentTarget as HTMLElement).dataset.idx || "",
      10
    );
    this._editingIndex = idx;
  }

  private _removeItem(ev: Event): void {
    ev.stopPropagation();
    const idx = parseInt((ev.target as HTMLElement).dataset.idx || "", 10);
    if (this._editingIndex === idx) {
      this._editingIndex = undefined;
    }
    this._emit(this.badges.filter((_badge, index) => index !== idx));
  }

  private _moveItem(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    if (oldIndex === newIndex) {
      return;
    }
    const badges = [...this.badges];
    const [moved] = badges.splice(oldIndex, 1);
    badges.splice(newIndex, 0, moved);
    this._emit(badges);
  }

  // ---- configure ------------------------------------------------------------

  private _doneConfigure(): void {
    this._editingIndex = undefined;
  }

  private _configChanged(ev: CustomEvent<ConfigChangedEvent>): void {
    ev.stopPropagation();
    if (this._editingIndex === undefined) {
      return;
    }
    const config = ev.detail.config as LovelaceBadgeConfig;
    const badges = this.badges.map((badge, index) =>
      index === this._editingIndex ? config : badge
    );
    this._emit(badges);
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <div class="field">
        <ha-sortable
          no-style
          @item-moved=${this._moveItem}
          handle-selector="ha-input-chip"
          filter=".add"
        >
          <ha-chip-set>
            ${repeat(
              this.badges,
              (badge) => this._badgeKey(badge),
              (badge, idx) => html`
                <ha-input-chip
                  data-idx=${idx}
                  @remove=${this._removeItem}
                  @click=${this._chipClicked}
                  .label=${this._badgeLabel(badge)}
                  selected
                >
                  ${
                    badge.entity
                      ? html`<ha-state-icon
                          slot="icon"
                          .hass=${this.hass}
                          .stateObj=${this.hass.states[badge.entity as string]}
                        ></ha-state-icon>`
                      : nothing
                  }
                  <span>${this._badgeLabel(badge)}</span>
                </ha-input-chip>
              `
            )}
            <ha-assist-chip
              class="add"
              .label=${this.hass.localize(
                "ui.panel.lovelace.editor.edit_view_header.heading_add"
              )}
              @click=${this._toggleAdd}
            >
              <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            </ha-assist-chip>
          </ha-chip-set>
        </ha-sortable>
      </div>

      ${this._adding ? this._renderAddPanel() : nothing}
      ${
        this._editingIndex !== undefined
          ? this._renderConfigure(this._editingIndex)
          : nothing
      }
    `;
  }

  private _renderAddPanel() {
    const suggestions = this._suggestions();
    return html`
      <div class="add-panel">
        <span class="panel-title"
          >${this.hass.localize(
            "ui.panel.lovelace.editor.edit_view_header.add_badge_title"
          )}</span
        >
        <ha-entity-picker
          autofocus
          hide-clear-icon
          .hass=${this.hass}
          .searchLabel=${this.hass.localize(
            "ui.panel.lovelace.editor.edit_view_header.badge_search"
          )}
          .placeholder=${this.hass.localize(
            "ui.panel.lovelace.editor.edit_view_header.badge_search"
          )}
          @value-changed=${this._entityPicked}
        ></ha-entity-picker>
        ${
          suggestions.length
            ? html`
                <span class="suggested-label"
                  >${this.hass.localize(
                    "ui.panel.lovelace.editor.edit_view_header.badge_suggested"
                  )}</span
                >
                <div class="suggested">
                  ${suggestions.map(
                    (suggestion) => html`
                      <button
                        type="button"
                        class="suggestion"
                        data-entity=${suggestion.entity}
                        @click=${this._suggestionClicked}
                      >
                        <ha-state-icon
                          .hass=${this.hass}
                          .stateObj=${this.hass.states[suggestion.entity]}
                        ></ha-state-icon>
                        <span>${suggestion.name}</span>
                      </button>
                    `
                  )}
                </div>
              `
            : nothing
        }
      </div>
    `;
  }

  private _renderConfigure(index: number) {
    const config = ensureBadgeConfig(this.badges[index]);
    return html`
      <div class="configure">
        <div class="configure-header">
          <span class="panel-title"
            >${this.hass.localize(
              "ui.panel.lovelace.editor.edit_view_header.configure_badge"
            )}</span
          >
          <ha-button appearance="plain" @click=${this._doneConfigure}>
            ${this.hass.localize(
              "ui.panel.lovelace.editor.edit_view_header.done"
            )}
          </ha-button>
        </div>
        <hui-badge-element-editor
          .hass=${this.hass}
          .lovelace=${this.lovelaceConfig}
          .value=${config}
          @config-changed=${this._configChanged}
        ></hui-badge-element-editor>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }
    .field {
      position: relative;
      background-color: var(--mdc-text-field-fill-color, whitesmoke);
      border-radius: var(--ha-border-radius-sm);
      border-end-end-radius: var(--ha-border-radius-square);
      border-end-start-radius: var(--ha-border-radius-square);
    }
    .field:after {
      display: block;
      content: "";
      position: absolute;
      pointer-events: none;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      width: 100%;
      background-color: var(
        --mdc-text-field-idle-line-color,
        rgba(0, 0, 0, 0.42)
      );
    }
    ha-chip-set {
      padding: var(--ha-space-3);
    }
    ha-state-icon {
      --mdc-icon-size: 18px;
    }
    /* Add badge panel. */
    .add-panel {
      margin-top: var(--ha-space-3);
      padding: var(--ha-space-4);
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-lg);
      background: var(--card-background-color);
    }
    .panel-title {
      display: block;
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
      margin-bottom: var(--ha-space-3);
    }
    .suggested-label {
      display: block;
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
      margin: var(--ha-space-3) 0 var(--ha-space-2);
    }
    .suggested {
      display: flex;
      flex-direction: column;
    }
    .suggestion {
      appearance: none;
      border: 0;
      background: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: var(--ha-space-3);
      padding: var(--ha-space-2) var(--ha-space-2);
      border-radius: var(--ha-border-radius-md);
      color: var(--primary-text-color);
      font-family: inherit;
      font-size: var(--ha-font-size-m);
      text-align: start;
    }
    .suggestion:hover {
      background: var(--secondary-background-color);
    }
    /* Configure panel. */
    .configure {
      margin-top: var(--ha-space-3);
      padding: var(--ha-space-4);
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-lg);
      background: var(--card-background-color);
    }
    .configure-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--ha-space-2);
    }
    .configure-header .panel-title {
      margin-bottom: 0;
    }
    .sortable-fallback {
      display: none;
      opacity: 0;
    }
    .sortable-ghost {
      opacity: 0.4;
    }
    .sortable-drag {
      cursor: grabbing;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-header-badges-field": HuiViewHeaderBadgesField;
  }
}
