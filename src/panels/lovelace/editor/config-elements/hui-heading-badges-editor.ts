import "@material/mwc-menu/mwc-menu-surface";
import { mdiDelete, mdiDragHorizontalVariant, mdiPencil } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../../common/dom/fire_event";
import { preventDefault } from "../../../../common/dom/prevent_default";
import "../../../../components/entity/ha-entity-picker";
import type { HaEntityPicker } from "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant } from "../../../../types";
import type {
  EntityHeadingBadgeConfig,
  LovelaceHeadingBadgeConfig,
} from "../../heading-badges/types";

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

  private _createValueChangedHandler(index: number) {
    return (ev: CustomEvent) => this._valueChanged(ev, index);
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      ${this.badges
        ? html`
            <ha-sortable
              handle-selector=".handle"
              @item-moved=${this._badgeMoved}
            >
              <div class="entities">
                ${repeat(
                  this.badges,
                  (badge) => this._getKey(badge),
                  (badge, index) => {
                    const type = badge.type ?? "entity";
                    const isEntityBadge =
                      type === "entity" && "entity" in badge;
                    const entityBadge = isEntityBadge
                      ? (badge as EntityHeadingBadgeConfig)
                      : undefined;
                    return html`
                      <div class="badge">
                        <div class="handle">
                          <ha-svg-icon
                            .path=${mdiDragHorizontalVariant}
                          ></ha-svg-icon>
                        </div>
                        ${isEntityBadge && entityBadge
                          ? html`
                              <ha-entity-picker
                                allow-custom-entity
                                hide-clear-icon
                                .hass=${this.hass}
                                .value=${entityBadge.entity ?? ""}
                                @value-changed=${this._createValueChangedHandler(
                                  index
                                )}
                              ></ha-entity-picker>
                            `
                          : html`
                              <div class="badge-content">
                                <span>${type}</span>
                              </div>
                            `}
                        <ha-icon-button
                          .label=${this.hass!.localize(
                            `ui.panel.lovelace.editor.entities.edit`
                          )}
                          .path=${mdiPencil}
                          class="edit-icon"
                          .index=${index}
                          @click=${this._editBadge}
                        ></ha-icon-button>
                        <ha-icon-button
                          .label=${this.hass!.localize(
                            `ui.panel.lovelace.editor.entities.remove`
                          )}
                          .path=${mdiDelete}
                          class="remove-icon"
                          .index=${index}
                          @click=${this._removeEntity}
                        ></ha-icon-button>
                      </div>
                    `;
                  }
                )}
              </div>
            </ha-sortable>
          `
        : nothing}
      <div class="add-container">
        <ha-entity-picker
          .hass=${this.hass}
          id="input"
          .placeholder=${this.hass.localize(
            "ui.components.entity.entity-picker.choose_entity"
          )}
          .searchLabel=${this.hass.localize(
            "ui.components.entity.entity-picker.choose_entity"
          )}
          @value-changed=${this._entityPicked}
          .value=${undefined}
          @click=${preventDefault}
          allow-custom-entity
          add-button
        ></ha-entity-picker>
      </div>
    `;
  }

  private _entityPicked(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!ev.detail.value) {
      return;
    }
    const newEntity: LovelaceHeadingBadgeConfig = {
      type: "entity",
      entity: ev.detail.value,
    };
    const newBadges = [...(this.badges || []), newEntity];
    (ev.target as HaEntityPicker).value = undefined;
    fireEvent(this, "heading-badges-changed", { badges: newBadges });
  }

  private _valueChanged(ev: CustomEvent, index: number): void {
    ev.stopPropagation();
    const value = ev.detail.value;
    const newBadges = [...(this.badges || [])];

    if (!value) {
      newBadges.splice(index, 1);
    } else {
      newBadges[index] = {
        ...newBadges[index],
        entity: value,
      };
    }

    fireEvent(this, "heading-badges-changed", { badges: newBadges });
  }

  private _badgeMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const newBadges = [...(this.badges || [])];

    newBadges.splice(newIndex, 0, newBadges.splice(oldIndex, 1)[0]);

    fireEvent(this, "heading-badges-changed", { badges: newBadges });
  }

  private _removeEntity(ev: CustomEvent): void {
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
    ha-button {
      margin-top: var(--ha-space-2);
    }

    .entities {
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
      height: 60px;
      font-size: var(--ha-font-size-l);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-grow: 1;
    }

    .badge-content div {
      display: flex;
      flex-direction: column;
    }

    .badge ha-entity-picker {
      flex-grow: 1;
      min-width: 0;
      margin-top: 0;
    }

    .remove-icon,
    .edit-icon {
      --mdc-icon-button-size: 36px;
      color: var(--secondary-text-color);
    }

    .secondary {
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
    }

    li[divider] {
      border-bottom-color: var(--divider-color);
    }

    .add-container {
      position: relative;
      width: 100%;
      margin-top: var(--ha-space-2);
    }

    mwc-menu-surface {
      --mdc-menu-min-width: 100%;
    }

    ha-entity-picker {
      display: block;
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-heading-badges-editor": HuiHeadingBadgesEditor;
  }
}
