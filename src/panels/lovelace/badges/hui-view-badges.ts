import { mdiPlus } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-ripple";
import "../../../components/ha-sortable";
import type { HaSortableOptions } from "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../types";
import "../components/hui-badge-edit-mode";
import { moveBadge } from "../editor/config-util";
import type { LovelaceCardPath } from "../editor/lovelace-path";
import type { Lovelace } from "../types";
import type { HuiBadge } from "./hui-badge";

const BADGE_SORTABLE_OPTIONS: HaSortableOptions = {
  delay: 100,
  delayOnTouchOnly: true,
  direction: "horizontal",
  invertedSwapThreshold: 0.7,
} as HaSortableOptions;

@customElement("hui-view-badges")
export class HuiViewBadges extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false }) public badges: HuiBadge[] = [];

  @property({ attribute: false }) public viewIndex!: number;

  @property({ type: Boolean, attribute: "show-add-label" })
  public showAddLabel!: boolean;

  @state() _dragging = false;

  private _badgeConfigKeys = new WeakMap<HuiBadge, string>();

  private _checkAllHidden() {
    const allHidden =
      !this.lovelace.editMode && this.badges.every((section) => section.hidden);
    this.toggleAttribute("hidden", allHidden);
  }

  private _badgeVisibilityChanged = () => {
    this._checkAllHidden();
  };

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener(
      "badge-visibility-changed",
      this._badgeVisibilityChanged
    );
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener(
      "badge-visibility-changed",
      this._badgeVisibilityChanged
    );
  }

  willUpdate(changedProperties: PropertyValues<typeof this>): void {
    if (changedProperties.has("badges") || changedProperties.has("lovelace")) {
      this._checkAllHidden();
    }
  }

  private _getBadgeKey(badge: HuiBadge) {
    if (!this._badgeConfigKeys.has(badge)) {
      this._badgeConfigKeys.set(badge, Math.random().toString());
    }
    return this._badgeConfigKeys.get(badge)!;
  }

  private _badgeMoved(ev) {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const newConfig = moveBadge(
      this.lovelace!.config,
      [this.viewIndex!, oldIndex],
      [this.viewIndex!, newIndex]
    );
    this.lovelace!.saveConfig(newConfig);
  }

  private _badgeAdded(ev) {
    ev.stopPropagation();
    const { index, data } = ev.detail;
    const oldPath = data as LovelaceCardPath;
    const newPath = [this.viewIndex!, index] as LovelaceCardPath;
    const newConfig = moveBadge(this.lovelace!.config, oldPath, newPath);
    this.lovelace!.saveConfig(newConfig);
  }

  private _badgeRemoved(ev) {
    ev.stopPropagation();
    // Do nothing, it's handled by the "item-added" event from the new parent.
  }

  private _dragStart() {
    this._dragging = true;
  }

  private _dragEnd() {
    this._dragging = false;
  }

  private _addBadge() {
    fireEvent(this, "ll-create-badge");
  }

  render() {
    if (!this.lovelace) return nothing;

    const editMode = this.lovelace.editMode;

    const badges = this.badges;

    return html`
      ${badges?.length > 0 || editMode
        ? html`
            <ha-sortable
              .disabled=${!editMode}
              @item-moved=${this._badgeMoved}
              @item-added=${this._badgeAdded}
              @item-removed=${this._badgeRemoved}
              @drag-start=${this._dragStart}
              @drag-end=${this._dragEnd}
              group="badge"
              draggable-selector="[data-sortable]"
              .rollback=${false}
              .options=${BADGE_SORTABLE_OPTIONS}
              invert-swap
            >
              <div class="badges ${classMap({ "edit-mode": editMode })}">
                ${repeat(
                  badges,
                  (badge) => this._getBadgeKey(badge),
                  (badge, idx) => {
                    const badgePath = [this.viewIndex, idx] as LovelaceCardPath;
                    return html`
                      ${editMode
                        ? html`
                            <hui-badge-edit-mode
                              data-sortable
                              .hass=${this.hass}
                              .lovelace=${this.lovelace}
                              .path=${badgePath}
                              .hiddenOverlay=${this._dragging}
                              .sortableData=${badgePath}
                            >
                              ${badge}
                            </hui-badge-edit-mode>
                          `
                        : badge}
                    `;
                  }
                )}
                ${editMode
                  ? html`
                      <button
                        class="add"
                        @click=${this._addBadge}
                        aria-label=${this.hass.localize(
                          "ui.panel.lovelace.editor.section.add_badge"
                        )}
                        .title=${this.hass.localize(
                          "ui.panel.lovelace.editor.section.add_badge"
                        )}
                      >
                        <ha-ripple></ha-ripple>
                        <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                        ${this.showAddLabel
                          ? this.hass.localize(
                              "ui.panel.lovelace.editor.section.add_badge"
                            )
                          : nothing}
                      </button>
                    `
                  : nothing}
              </div>
            </ha-sortable>
          `
        : nothing}
    `;
  }

  static styles = css`
    :host([hidden]) {
      display: none !important;
    }

    .badges {
      display: flex;
      align-items: flex-start;
      flex-wrap: var(--badges-wrap, wrap);
      justify-content: var(--badges-aligmnent, center);
      gap: var(--ha-space-2);
      margin: 0;
    }

    /* Use before and after because padding doesn't work well with scrolling */
    .badges::before,
    .badges::after {
      content: "";
      position: relative;
      display: block;
      min-width: var(--badge-padding, 0px);
      height: 16px;
      background-color: transparent;
    }
    .badges::before {
      margin-left: -8px;
      margin-inline-start: -8px;
      margin-inline-end: 0;
    }
    .badges::after {
      margin-right: -8px;
      margin-inline-end: -8px;
      margin-inline-start: 0;
    }

    .badges > * {
      min-width: fit-content;
    }

    hui-badge-edit-mode {
      display: block;
      position: relative;
      min-width: 36px;
      min-height: 36px;
    }

    .add {
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: center;
      outline: none;
      gap: var(--ha-space-2);
      height: 36px;
      padding: 6px 20px 6px 20px;
      box-sizing: border-box;
      width: auto;
      border-radius: 18px;
      background-color: transparent;
      border-width: 2px;
      border-style: dashed;
      border-color: var(--primary-color);
      --mdc-icon-size: 18px;
      cursor: pointer;
      font-size: var(--ha-font-size-m);
      color: var(--primary-text-color);
      --ha-ripple-color: var(--primary-color);
      --ha-ripple-hover-opacity: 0.04;
      --ha-ripple-pressed-opacity: 0.12;
    }
    .add:focus {
      border-style: solid;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-badges": HuiViewBadges;
  }
}
