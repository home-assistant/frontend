import { mdiDelete, mdiDrag, mdiPencil, mdiPlus } from "@mdi/js";
import { ComboBoxLightOpenedChangedEvent } from "@vaadin/combo-box/vaadin-combo-box-light";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../../common/dom/fire_event";
import { preventDefault } from "../../../../common/dom/prevent_default";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import "../../../../components/entity/ha-entity-picker";
import type { HaEntityPicker } from "../../../../components/entity/ha-entity-picker";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-list-item";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import { HomeAssistant } from "../../../../types";
import { LovelaceHeadingItemConfig } from "../../heading-items/types";

declare global {
  interface HASSDomEvents {
    "edit-heading-item": { index: number };
    "heading-items-changed": { items: LovelaceHeadingItemConfig[] };
  }
}

@customElement("hui-heading-items-editor")
export class HuiHeadingItemsEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public items?: LovelaceHeadingItemConfig[];

  @query(".add-container", true) private _addContainer?: HTMLDivElement;

  @query("ha-entity-picker") private _entityPicker?: HaEntityPicker;

  @state() private _addMode = false;

  private _opened = false;

  private _itemsKeys = new WeakMap<LovelaceHeadingItemConfig, string>();

  private _getKey(item: LovelaceHeadingItemConfig) {
    if (!this._itemsKeys.has(item)) {
      this._itemsKeys.set(item, Math.random().toString());
    }

    return this._itemsKeys.get(item)!;
  }

  private _renderItemLabel(item: LovelaceHeadingItemConfig) {
    const type = item.type ?? "entity";

    if (type === "entity") {
      const entityId = "entity" in item ? (item.entity as string) : undefined;
      const stateObj = entityId ? this.hass.states[entityId] : undefined;
      return (
        (stateObj && stateObj.attributes.friendly_name) ||
        entityId ||
        type ||
        "Unknown item"
      );
    }
    return type;
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      ${this.items
        ? html`
            <ha-sortable
              handle-selector=".handle"
              @item-moved=${this._itemMoved}
            >
              <div class="entities">
                ${repeat(
                  this.items,
                  (itemConf) => this._getKey(itemConf),
                  (itemConf, index) => {
                    const label = this._renderItemLabel(itemConf);
                    return html`
                      <div class="item">
                        <div class="handle">
                          <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                        </div>
                        <div class="item-content">
                          <span>${label}</span>
                        </div>
                        <ha-icon-button
                          .label=${this.hass!.localize(
                            `ui.panel.lovelace.editor.entities.edit`
                          )}
                          .path=${mdiPencil}
                          class="edit-icon"
                          .index=${index}
                          @click=${this._editItem}
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
        <ha-button
          data-add-entity
          outlined
          .label=${this.hass!.localize(`ui.panel.lovelace.editor.entities.add`)}
          @click=${this._addEntity}
        >
          <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
        </ha-button>
        ${this._renderPicker()}
      </div>
    `;
  }

  private _renderPicker() {
    if (!this._addMode) {
      return nothing;
    }
    return html`
      <mwc-menu-surface
        open
        .anchor=${this._addContainer}
        @closed=${this._onClosed}
        @opened=${this._onOpened}
        @opened-changed=${this._openedChanged}
        @input=${stopPropagation}
      >
        <ha-entity-picker
          .hass=${this.hass}
          id="input"
          .type=${"entity_id"}
          .label=${this.hass.localize(
            "ui.components.target-picker.add_entity_id"
          )}
          @value-changed=${this._entityPicked}
          @click=${preventDefault}
          allow-custom-entity
        ></ha-entity-picker>
      </mwc-menu-surface>
    `;
  }

  private _onClosed(ev) {
    ev.stopPropagation();
    ev.target.open = true;
  }

  private async _onOpened() {
    if (!this._addMode) {
      return;
    }
    await this._entityPicker?.focus();
    await this._entityPicker?.open();
    this._opened = true;
  }

  private _openedChanged(ev: ComboBoxLightOpenedChangedEvent) {
    if (this._opened && !ev.detail.value) {
      this._opened = false;
      this._addMode = false;
    }
  }

  private async _addEntity(ev): Promise<void> {
    ev.stopPropagation();
    this._addMode = true;
  }

  private _entityPicked(ev) {
    ev.stopPropagation();
    if (!ev.detail.value) {
      return;
    }
    const newEntity: LovelaceHeadingItemConfig = {
      type: "entity",
      entity: ev.detail.value,
    };
    const newItems = (this.items || []).concat(newEntity);
    fireEvent(this, "heading-items-changed", { items: newItems });
  }

  private _itemMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;

    const newItems = (this.items || []).concat();

    newItems.splice(newIndex, 0, newItems.splice(oldIndex, 1)[0]);

    fireEvent(this, "heading-items-changed", { items: newItems });
  }

  private _removeEntity(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    const newItems = (this.items || []).concat();

    newItems.splice(index, 1);

    fireEvent(this, "heading-items-changed", { items: newItems });
  }

  private _editItem(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    fireEvent(this, "edit-heading-item", {
      index,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex !important;
        flex-direction: column;
      }
      ha-button {
        margin-top: 8px;
      }
      .item {
        display: flex;
        align-items: center;
      }
      .item .handle {
        cursor: move; /* fallback if grab cursor is unsupported */
        cursor: grab;
        padding-right: 8px;
        padding-inline-end: 8px;
        padding-inline-start: initial;
        direction: var(--direction);
      }
      .item .handle > * {
        pointer-events: none;
      }

      .item-content {
        height: 60px;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-grow: 1;
      }

      .item-content div {
        display: flex;
        flex-direction: column;
      }

      .remove-icon,
      .edit-icon {
        --mdc-icon-button-size: 36px;
        color: var(--secondary-text-color);
      }

      .secondary {
        font-size: 12px;
        color: var(--secondary-text-color);
      }

      li[divider] {
        border-bottom-color: var(--divider-color);
      }

      .add-container {
        position: relative;
        width: 100%;
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
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-heading-items-editor": HuiHeadingItemsEditor;
  }
}
