import { mdiClose, mdiDragHorizontalVariant, mdiPencil } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeEntityPickerDisplay } from "../../../common/entity/compute_entity_name_display";
import "../../../components/entity/ha-entity-picker";
import type { HaEntityPicker } from "../../../components/entity/ha-entity-picker";
import "../../../components/ha-icon-button";
import "../../../components/ha-sortable";
import "../../../components/item/ha-list-item-base";
import "../../../components/list/ha-list-base";
import type { HaEntityPickerEntityFilterFunc } from "../../../data/entity/entity";
import type { HomeAssistant } from "../../../types";
import type { EntityConfig } from "../entity-rows/types";

@customElement("hui-entity-editor")
export class HuiEntityEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entities?: EntityConfig[];

  @property({ attribute: false })
  public entityFilter?: HaEntityPickerEntityFilterFunc;

  @property() public label?: string;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: "can-edit", type: Boolean }) public canEdit?;

  private _entityKeys = new WeakMap<EntityConfig, string>();

  private _getKey(action: EntityConfig) {
    if (!this._entityKeys.has(action)) {
      this._entityKeys.set(action, Math.random().toString());
    }

    return this._entityKeys.get(action)!;
  }

  private _renderItem(item: EntityConfig, index: number) {
    const stateObj = this.hass.states[item.entity];

    const { primary, secondary } = stateObj
      ? computeEntityPickerDisplay(this.hass, stateObj)
      : { primary: item.entity, secondary: undefined };

    return html`
      <ha-list-item-base class="item">
        <ha-svg-icon
          class="handle"
          .path=${mdiDragHorizontalVariant}
          slot="start"
        ></ha-svg-icon>

        <div slot="headline" class="label">${primary}</div>
        ${
          secondary
            ? html`<div slot="supporting-text" class="description">
                ${secondary}
              </div>`
            : nothing
        }
        <ha-icon-button
          slot="end"
          .item=${item}
          .index=${index}
          .label=${this.hass.localize("ui.common.edit")}
          .path=${mdiPencil}
          @click=${this._editItem}
        ></ha-icon-button>
        <ha-icon-button
          slot="end"
          .index=${index}
          .label=${this.hass.localize("ui.common.delete")}
          .path=${mdiClose}
          @click=${this._deleteItem}
        ></ha-icon-button>
      </ha-list-item-base>
    `;
  }

  private _editItem(ev) {
    const index = (ev.currentTarget as any).index;
    fireEvent(this, "edit-detail-element", {
      subElementConfig: {
        index,
        type: "row",
        elementConfig: this.entities![index],
      },
    });
  }

  private _deleteItem(ev) {
    const index = ev.target.index;
    const newConfigEntities = this.entities!.slice(0, index).concat(
      this.entities!.slice(index + 1)
    );
    fireEvent(this, "entities-changed", { entities: newConfigEntities });
  }

  protected render() {
    if (!this.entities) {
      return nothing;
    }

    return html`
      <h3>
        ${
          this.label ||
          `${this.hass.localize("ui.panel.lovelace.editor.card.generic.entities")}${
            this.required
              ? ` (${this.hass.localize("ui.panel.lovelace.editor.card.config.required")})`
              : ""
          }`
        }
      </h3>
      ${
        this.canEdit
          ? html`
              <div class="items-container">
                <ha-sortable
                  handle-selector=".handle"
                  draggable-selector=".item"
                  @item-moved=${this._entityMoved}
                >
                  <ha-list-base>
                    ${this.entities.map((item, index) =>
                      this._renderItem(item, index)
                    )}
                  </ha-list-base>
                </ha-sortable>
              </div>
            `
          : html`<ha-sortable
              handle-selector=".handle"
              @item-moved=${this._entityMoved}
            >
              <div class="entities">
                ${repeat(
                  this.entities,
                  (entityConf) => this._getKey(entityConf),
                  (entityConf, index) => html`
                    <div class="entity" data-entity-id=${entityConf.entity}>
                      <div class="handle">
                        <ha-svg-icon
                          .path=${mdiDragHorizontalVariant}
                        ></ha-svg-icon>
                      </div>
                      <ha-entity-picker
                        .value=${entityConf.entity}
                        .index=${index}
                        .entityFilter=${this.entityFilter}
                        @value-changed=${this._valueChanged}
                      ></ha-entity-picker>
                    </div>
                  `
                )}
              </div>
            </ha-sortable>`
      }
      <ha-entity-picker
        .entityFilter=${this.entityFilter}
        @value-changed=${this._addEntity}
        add-button
      ></ha-entity-picker>
    `;
  }

  private async _addEntity(ev: CustomEvent): Promise<void> {
    const value = ev.detail.value;
    if (value === "") {
      return;
    }
    const newConfigEntities = this.entities!.concat({
      entity: value as string,
    });
    (ev.target as HaEntityPicker).value = "";
    fireEvent(this, "entities-changed", { entities: newConfigEntities });
  }

  private _entityMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;

    const newEntities = this.entities!.concat();

    newEntities.splice(newIndex, 0, newEntities.splice(oldIndex, 1)[0]);

    fireEvent(this, "entities-changed", { entities: newEntities });
  }

  private _valueChanged(ev: CustomEvent): void {
    const value = ev.detail.value;
    const index = (ev.target as any).index;
    const newConfigEntities = this.entities!.concat();

    if (value === "" || value === undefined) {
      newConfigEntities.splice(index, 1);
    } else {
      newConfigEntities[index] = {
        ...newConfigEntities[index],
        entity: value!,
      };
    }

    fireEvent(this, "entities-changed", { entities: newConfigEntities });
  }

  static styles = css`
    .entity {
      display: flex;
      align-items: center;
    }
    .entity .handle {
      padding-right: 8px;
      cursor: move; /* fallback if grab cursor is unsupported */
      cursor: grab;
      padding-inline-end: 8px;
      padding-inline-start: initial;
      direction: var(--direction);
    }
    .entity .handle > * {
      pointer-events: none;
    }
    .entity ha-entity-picker {
      flex-grow: 1;
    }
    ha-entity-picker:is([add-button]) {
      display: block;
      margin-inline-start: var(--ha-space-1);
      margin-bottom: var(--ha-space-1);
    }
    ha-list-base {
      --ha-list-gap: var(--ha-space-2);
      --ha-list-padding: 0 0 var(--ha-space-2);
    }
    ha-list-base:has(> *) {
      margin-bottom: var(--ha-space-2);
    }
    ha-list-item-base {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-border-radius-md);
      --ha-row-item-gap: 0;
      --ha-row-item-padding-block: 0;
      --ha-row-item-padding-inline: var(--ha-space-3) var(--ha-space-1);
    }
    ha-list-item-base::part(start),
    ha-list-item-base::part(end) {
      color: var(--ha-color-text-secondary);
    }
    .handle {
      cursor: move;
      padding: 8px;
      margin-inline-start: -8px;
    }
    label {
      margin-bottom: 8px;
      display: block;
    }
    ha-list-item-base .label,
    ha-list-item-base .description {
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-editor": HuiEntityEditor;
  }
}
