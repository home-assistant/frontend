import {
  mdiDelete,
  mdiDragHorizontalVariant,
  mdiPencil,
  mdiPlus,
} from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeEntityNameList } from "../../../../common/entity/compute_entity_name_display";
import { computeRTL } from "../../../../common/util/compute_rtl";
import { nextRender } from "../../../../common/util/render-status";
import "../../../../components/ha-button";
import "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import type { HaDropdownItem } from "../../../../components/ha-dropdown-item";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";
import { getHeadingBadgeElementClass } from "../../create-element/create-heading-badge-element";
import type {
  ButtonHeadingBadgeConfig,
  EntityHeadingBadgeConfig,
  LovelaceHeadingBadgeConfig,
} from "../../heading-badges/types";

const UI_BADGE_TYPES = ["entity", "button"] as const;

declare global {
  interface HASSDomEvents {
    "edit-heading-badge": { index: number };
    "heading-badges-changed": { badges: LovelaceHeadingBadgeConfig[] };
  }
}

@customElement("hui-heading-badges-editor")
export class HuiHeadingBadgesEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public badges?: LovelaceHeadingBadgeConfig[];

  private _badgesKeys = new WeakMap<LovelaceHeadingBadgeConfig, string>();

  private _getKey(badge: LovelaceHeadingBadgeConfig) {
    if (!this._badgesKeys.has(badge)) {
      this._badgesKeys.set(badge, Math.random().toString());
    }

    return this._badgesKeys.get(badge)!;
  }

  private _getBadgeTypeLabel(type: string): string {
    return (
      this.hass.localize(
        `ui.panel.lovelace.editor.heading-badges.types.${type}.label`
      ) || type
    );
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      ${this.badges?.length
        ? html`
            <ha-sortable
              handle-selector=".handle"
              @item-moved=${this._badgeMoved}
            >
              <div class="badges">
                ${repeat(
                  this.badges.filter(Boolean),
                  (badge) => this._getKey(badge),
                  (badge, index) => this._renderBadgeItem(badge, index)
                )}
              </div>
            </ha-sortable>
          `
        : nothing}
      <ha-dropdown @wa-select=${this._addBadge}>
        <ha-button slot="trigger" appearance="filled" size="small">
          <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
          ${this.hass.localize(`ui.panel.lovelace.editor.heading-badges.add`)}
        </ha-button>
        ${UI_BADGE_TYPES.map(
          (type) => html`
            <ha-dropdown-item .value=${type}>
              ${this._getBadgeTypeLabel(type)}
            </ha-dropdown-item>
          `
        )}
      </ha-dropdown>
    `;
  }

  private _renderBadgeItem(badge: LovelaceHeadingBadgeConfig, index: number) {
    const type = badge.type ?? "entity";
    const entityBadge = badge as EntityHeadingBadgeConfig;
    const isWarning =
      type === "entity" &&
      (!entityBadge.entity || !this.hass.states[entityBadge.entity]);

    return html`
      <div class=${classMap({ badge: true, warning: isWarning })}>
        <div class="handle">
          <ha-svg-icon .path=${mdiDragHorizontalVariant}></ha-svg-icon>
        </div>
        ${type === "entity"
          ? this._renderEntityBadge(entityBadge)
          : type === "button"
            ? this._renderButtonBadge(badge as ButtonHeadingBadgeConfig)
            : this._renderUnknownBadge(type)}
        <ha-icon-button
          .label=${this.hass.localize(`ui.panel.lovelace.editor.badges.edit`)}
          .path=${mdiPencil}
          class="edit-icon"
          .index=${index}
          @click=${this._editBadge}
        ></ha-icon-button>
        <ha-icon-button
          .label=${this.hass.localize(`ui.panel.lovelace.editor.badges.remove`)}
          .path=${mdiDelete}
          class="remove-icon"
          .index=${index}
          @click=${this._removeBadge}
        ></ha-icon-button>
      </div>
    `;
  }

  private _renderEntityBadge(badge: EntityHeadingBadgeConfig) {
    const entityId = badge.entity;
    const stateObj = entityId ? this.hass.states[entityId] : undefined;

    if (!entityId) {
      return html`
        <div class="badge-content">
          <div>
            <span>${this._getBadgeTypeLabel("entity")}</span>
            <span class="secondary"
              >${this.hass.localize(
                "ui.panel.lovelace.editor.heading-badges.no_entity"
              )}</span
            >
          </div>
        </div>
      `;
    }

    if (!stateObj) {
      return html`
        <div class="badge-content">
          <div>
            <span>${entityId}</span>
            <span class="secondary"
              >${this.hass.localize(
                "ui.panel.lovelace.editor.heading-badges.entity_not_found"
              )}</span
            >
          </div>
        </div>
      `;
    }

    const [entityName, deviceName, areaName] = computeEntityNameList(
      stateObj,
      [{ type: "entity" }, { type: "device" }, { type: "area" }],
      this.hass.entities,
      this.hass.devices,
      this.hass.areas,
      this.hass.floors
    );

    const isRTL = computeRTL(this.hass);

    const primary = entityName || deviceName || entityId;
    const secondary = [entityName ? deviceName : undefined, areaName]
      .filter(Boolean)
      .join(isRTL ? " ◂ " : " ▸ ");

    return html`
      <div class="badge-content">
        <div>
          <span>${primary}</span>
          ${secondary
            ? html`<span class="secondary">${secondary}</span>`
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderButtonBadge(badge: ButtonHeadingBadgeConfig) {
    return html`
      <div class="badge-content">
        <div>
          <span>${this._getBadgeTypeLabel("button")}</span>
          ${badge.text
            ? html`<span class="secondary">${badge.text}</span>`
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderUnknownBadge(type: string) {
    return html`
      <div class="badge-content">
        <div>
          <span>${type}</span>
        </div>
      </div>
    `;
  }

  private async _addBadge(ev: CustomEvent<{ item: HaDropdownItem }>) {
    const type = ev.detail.item.value;
    if (!type) {
      return;
    }

    const elClass = await getHeadingBadgeElementClass(type);

    let newBadge: LovelaceHeadingBadgeConfig;
    if (elClass && elClass.getStubConfig) {
      newBadge = elClass.getStubConfig(this.hass);
    } else {
      newBadge = { type } as LovelaceHeadingBadgeConfig;
    }

    const newBadges = [...(this.badges || []), newBadge];

    fireEvent(this, "heading-badges-changed", { badges: newBadges });

    await nextRender();
    // Open the editor for the new badge
    fireEvent(this, "edit-heading-badge", { index: newBadges.length - 1 });
  }

  private _badgeMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const newBadges = [...(this.badges || [])];

    newBadges.splice(newIndex, 0, newBadges.splice(oldIndex, 1)[0]);

    fireEvent(this, "heading-badges-changed", { badges: newBadges });
  }

  private _removeBadge(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    const newBadges = [...(this.badges || [])];

    newBadges.splice(index, 1);

    fireEvent(this, "heading-badges-changed", { badges: newBadges });
  }

  private _editBadge(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    fireEvent(this, "edit-heading-badge", {
      index,
    });
  }

  static styles = css`
    :host {
      display: flex !important;
      flex-direction: column;
    }

    ha-dropdown {
      display: inline-block;
      align-self: flex-start;
      margin-top: var(--ha-space-2);
    }

    .badges {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }

    .badge {
      display: flex;
      align-items: center;
    }

    .badge .handle {
      cursor: move; /* fallback if grab cursor is unsupported */
      cursor: grab;
      padding-right: var(--ha-space-2);
      padding-inline-end: var(--ha-space-2);
      padding-inline-start: initial;
      direction: var(--direction);
    }

    .badge .handle > * {
      pointer-events: none;
    }

    .badge-content {
      height: var(--ha-space-12);
      font-size: var(--ha-font-size-m);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-grow: 1;
    }

    .badge-content div {
      display: flex;
      flex-direction: column;
    }

    .remove-icon,
    .edit-icon {
      --mdc-icon-button-size: var(--ha-space-9);
      color: var(--secondary-text-color);
    }

    .secondary {
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
    }

    .badge.warning {
      background-color: var(--ha-color-fill-warning-quiet-resting);
      border-radius: var(--ha-border-radius-sm);
      overflow: hidden;
    }

    .badge.warning .secondary {
      color: var(--ha-color-on-warning-normal);
    }

    li[divider] {
      border-bottom-color: var(--divider-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-heading-badges-editor": HuiHeadingBadgesEditor;
  }
}
