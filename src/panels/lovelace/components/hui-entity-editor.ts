import { mdiClose, mdiDrag, mdiPencil } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entity-picker";
import type {
  HaEntityPicker,
  HaEntityPickerEntityFilterFunc,
} from "../../../components/entity/ha-entity-picker";
import "../../../components/ha-icon-button";
import "../../../components/ha-sortable";
import type { HomeAssistant } from "../../../types";
import type { EntityConfig } from "../entity-rows/types";

@customElement("hui-entity-editor")
export class HuiEntityEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public entities?: EntityConfig[];

  @property({ attribute: false })
  public entityFilter?: HaEntityPickerEntityFilterFunc;

  @property() public label?: string;

  @property({ attribute: "can-edit", type: Boolean }) public canEdit?;

  private _entityKeys = new WeakMap<EntityConfig, string>();

  private _getKey(action: EntityConfig) {
    if (!this._entityKeys.has(action)) {
      this._entityKeys.set(action, Math.random().toString());
    }

    return this._entityKeys.get(action)!;
  }

  private _renderItem(item: EntityConfig, index: number) {
    const stateObj = item.name ? undefined : this.hass!.states[item.entity];

    const name =
      item.name ||
      (stateObj &&
        (this.hass!.formatEntityName(stateObj, "entity") ||
          this.hass!.formatEntityName(stateObj, "device")));
    const label = name || item.entity;
    const description = name ? item.entity : "";

    return html`
      <ha-md-list-item class="item">
        <ha-svg-icon class="handle" .path=${mdiDrag} slot="start"></ha-svg-icon>

        <div slot="headline" class="label">${label}</div>
        ${description
          ? html`<div slot="supporting-text" class="description">
              ${description}
            </div>`
          : nothing}
        <ha-icon-button
          slot="end"
          .item=${item}
          .index=${index}
          .label=${this.hass!.localize("ui.common.edit")}
          .path=${mdiPencil}
          @click=${this._editItem}
        ></ha-icon-button>
        <ha-icon-button
          slot="end"
          .index=${index}
          .label=${this.hass!.localize("ui.common.delete")}
          .path=${mdiClose}
          @click=${this._deleteItem}
        ></ha-icon-button>
      </ha-md-list-item>
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
        ${this.label ||
        this.hass!.localize("ui.panel.lovelace.editor.card.generic.entities") +
          " (" +
          this.hass!.localize("ui.panel.lovelace.editor.card.config.required") +
          ")"}
      </h3>
      ${this.canEdit
        ? html`
            <div class="items-container">
              <ha-sortable
                handle-selector=".handle"
                draggable-selector=".item"
                @item-moved=${this._entityMoved}
              >
                <ha-md-list>
                  ${this.entities.map((item, index) =>
                    this._renderItem(item, index)
                  )}
                </ha-md-list>
              </ha-sortable>
            </div>
          `
        : html` <ha-sortable
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
                      <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                    </div>
                    <ha-entity-picker
                      .hass=${this.hass}
                      .value=${entityConf.entity}
                      .index=${index}
                      .entityFilter=${this.entityFilter}
                      @value-changed=${this._valueChanged}
                      allow-custom-entity
                    ></ha-entity-picker>
                  </div>
                `
              )}
            </div>
          </ha-sortable>`}
      <ha-entity-picker
        class="add-entity"
        .hass=${this.hass}
        .entityFilter=${this.entityFilter}
        @value-changed=${this._addEntity}
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
    ha-entity-picker {
      margin-top: 8px;
    }
    .add-entity {
      display: block;
      margin-left: 31px;
      margin-inline-start: 31px;
      margin-inline-end: initial;
      direction: var(--direction);
    }
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
    ha-md-list {
      gap: 8px;
    }
    ha-md-list-item {
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      --ha-md-list-item-gap: 0;
      --md-list-item-top-space: 0;
      --md-list-item-bottom-space: 0;
      --md-list-item-leading-space: 12px;
      --md-list-item-trailing-space: 4px;
      --md-list-item-two-line-container-height: 48px;
      --md-list-item-one-line-container-height: 48px;
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
    ha-md-list-item .label,
    ha-md-list-item .description {
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
