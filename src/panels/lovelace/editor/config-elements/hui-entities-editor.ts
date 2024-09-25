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

type EntityConfig = {
  entity: string;
};

declare global {
  interface HASSDomEvents {
    "edit-entity": { index: number };
  }
}

@customElement("hui-entities-editor")
export class HuiEntitiesEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public entities?: EntityConfig[];

  @query(".add-container", true) private _addContainer?: HTMLDivElement;

  @query("ha-entity-picker") private _entityPicker?: HaEntityPicker;

  @state() private _addMode = false;

  private _opened = false;

  private _entitiesKeys = new WeakMap<EntityConfig, string>();

  private _getKey(entity: EntityConfig) {
    if (!this._entitiesKeys.has(entity)) {
      this._entitiesKeys.set(entity, Math.random().toString());
    }

    return this._entitiesKeys.get(entity)!;
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    return html`
      ${this.entities
        ? html`
            <ha-sortable
              handle-selector=".handle"
              @item-moved=${this._entityMoved}
            >
              <div class="entities">
                ${repeat(
                  this.entities,
                  (entityConf) => this._getKey(entityConf),
                  (entityConf, index) => {
                    const editable = true;

                    const entityId = entityConf.entity;
                    const stateObj = this.hass.states[entityId];
                    const name = stateObj
                      ? stateObj.attributes.friendly_name
                      : undefined;
                    return html`
                      <div class="entity">
                        <div class="handle">
                          <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                        </div>
                        <div class="entity-content">
                          <span>${name || entityId}</span>
                        </div>
                        ${editable
                          ? html`
                              <ha-icon-button
                                .label=${this.hass!.localize(
                                  `ui.panel.lovelace.editor.entities.edit`
                                )}
                                .path=${mdiPencil}
                                class="edit-icon"
                                .index=${index}
                                @click=${this._editEntity}
                                .disabled=${!editable}
                              ></ha-icon-button>
                            `
                          : nothing}
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
    const newEntity: EntityConfig = { entity: ev.detail.value };
    const newEntities = (this.entities || []).concat(newEntity);
    fireEvent(this, "entities-changed", { entities: newEntities });
  }

  private _entityMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;

    const newEntities = (this.entities || []).concat();

    newEntities.splice(newIndex, 0, newEntities.splice(oldIndex, 1)[0]);

    fireEvent(this, "entities-changed", { entities: newEntities });
  }

  private _removeEntity(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    const newEntities = (this.entities || []).concat();

    newEntities.splice(index, 1);

    fireEvent(this, "entities-changed", { entities: newEntities });
  }

  private _editEntity(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    fireEvent(this, "edit-entity", {
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
      .entity {
        display: flex;
        align-items: center;
      }
      .entity .handle {
        cursor: move; /* fallback if grab cursor is unsupported */
        cursor: grab;
        padding-right: 8px;
        padding-inline-end: 8px;
        padding-inline-start: initial;
        direction: var(--direction);
      }
      .entity .handle > * {
        pointer-events: none;
      }

      .entity-content {
        height: 60px;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-grow: 1;
      }

      .entity-content div {
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
    "hui-entities-editor": HuiEntitiesEditor;
  }
}
