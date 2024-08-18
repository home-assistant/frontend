import { mdiPlus } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-sortable";
import type { HaSortableOptions } from "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import { HomeAssistant } from "../../../types";
import "../components/hui-badge-edit-mode";
import { moveBadge } from "../editor/config-util";
import { Lovelace } from "../types";
import { HuiBadge } from "./hui-badge";

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
    const { oldIndex, newIndex, oldPath, newPath } = ev.detail;
    const newConfig = moveBadge(
      this.lovelace!.config,
      [...oldPath, oldIndex] as [number, number, number],
      [...newPath, newIndex] as [number, number, number]
    );
    this.lovelace!.saveConfig(newConfig);
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
              @drag-start=${this._dragStart}
              @drag-end=${this._dragEnd}
              group="badge"
              draggable-selector="[data-sortable]"
              .path=${[this.viewIndex]}
              .rollback=${false}
              .options=${BADGE_SORTABLE_OPTIONS}
              invert-swap
            >
              <div class="badges">
                ${repeat(
                  badges,
                  (badge) => this._getBadgeKey(badge),
                  (badge, idx) => html`
                    ${editMode
                      ? html`
                          <hui-badge-edit-mode
                            data-sortable
                            .hass=${this.hass}
                            .lovelace=${this.lovelace}
                            .path=${[this.viewIndex, idx]}
                            .hiddenOverlay=${this._dragging}
                          >
                            ${badge}
                          </hui-badge-edit-mode>
                        `
                      : badge}
                  `
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
                        <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                      </button>
                    `
                  : nothing}
              </div>
            </ha-sortable>
          `
        : nothing}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host([hidden]) {
        display: none !important;
      }

      .badges {
        display: flex;
        align-items: flex-start;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
        margin: 0;
      }

      hui-badge-edit-mode {
        display: block;
        position: relative;
      }

      .add {
        position: relative;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
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
        color: var(--primary-text-color);
      }
      .add:focus {
        border-style: solid;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-badges": HuiViewBadges;
  }
}
