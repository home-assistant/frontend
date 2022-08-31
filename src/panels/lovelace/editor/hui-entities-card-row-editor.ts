import { mdiClose, mdiDrag, mdiPencil } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { guard } from "lit/directives/guard";
import type { SortableEvent } from "sortablejs";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entity-picker";
import type { HaEntityPicker } from "../../../components/entity/ha-entity-picker";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import { sortableStyles } from "../../../resources/ha-sortable-style";
import {
  loadSortable,
  SortableInstance,
} from "../../../resources/sortable.ondemand";
import { HomeAssistant } from "../../../types";
import { EntityConfig, LovelaceRowConfig } from "../entity-rows/types";

declare global {
  interface HASSDomEvents {
    "entities-changed": {
      entities: LovelaceRowConfig[];
    };
  }
}

@customElement("hui-entities-card-row-editor")
export class HuiEntitiesCardRowEditor extends LitElement {
  @property({ attribute: false }) protected hass?: HomeAssistant;

  @property({ attribute: false }) protected entities?: LovelaceRowConfig[];

  @property() protected label?: string;

  @state() private _attached = false;

  @state() private _renderEmptySortable = false;

  private _sortable?: SortableInstance;

  public connectedCallback() {
    super.connectedCallback();
    this._attached = true;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._attached = false;
  }

  protected render(): TemplateResult {
    if (!this.entities || !this.hass) {
      return html``;
    }

    return html`
      <h3>
        ${this.label ||
        `${this.hass!.localize(
          "ui.panel.lovelace.editor.card.generic.entities"
        )} (${this.hass!.localize(
          "ui.panel.lovelace.editor.card.config.required"
        )})`}
      </h3>
      <div class="entities">
        ${guard([this.entities, this._renderEmptySortable], () =>
          this._renderEmptySortable
            ? ""
            : this.entities!.map(
                (entityConf, index) => html`
                  <div class="entity">
                    <div class="handle">
                      <ha-svg-icon .path=${mdiDrag}></ha-svg-icon>
                    </div>
                    ${entityConf.type
                      ? html`
                          <div class="special-row">
                            <div>
                              <span>
                                ${this.hass!.localize(
                                  `ui.panel.lovelace.editor.card.entities.entity_row.${entityConf.type}`
                                )}
                              </span>
                              <span class="secondary"
                                >${this.hass!.localize(
                                  "ui.panel.lovelace.editor.card.entities.edit_special_row"
                                )}</span
                              >
                            </div>
                          </div>
                        `
                      : html`
                          <ha-entity-picker
                            allow-custom-entity
                            hideClearIcon
                            .hass=${this.hass}
                            .value=${(entityConf as EntityConfig).entity}
                            .index=${index}
                            @value-changed=${this._valueChanged}
                          ></ha-entity-picker>
                        `}
                    <ha-icon-button
                      .label=${this.hass!.localize(
                        "ui.components.entity.entity-picker.clear"
                      )}
                      .path=${mdiClose}
                      class="remove-icon"
                      .index=${index}
                      @click=${this._removeRow}
                    ></ha-icon-button>
                    <ha-icon-button
                      .label=${this.hass!.localize(
                        "ui.components.entity.entity-picker.edit"
                      )}
                      .path=${mdiPencil}
                      class="edit-icon"
                      .index=${index}
                      @click=${this._editRow}
                    ></ha-icon-button>
                  </div>
                `
              )
        )}
      </div>
      <ha-entity-picker
        class="add-entity"
        .hass=${this.hass}
        @value-changed=${this._addEntity}
      ></ha-entity-picker>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    const attachedChanged = changedProps.has("_attached");
    const entitiesChanged = changedProps.has("entities");

    if (!entitiesChanged && !attachedChanged) {
      return;
    }

    if (attachedChanged && !this._attached) {
      // Tear down sortable, if available
      this._sortable?.destroy();
      this._sortable = undefined;
      return;
    }

    if (!this._sortable && this.entities) {
      this._createSortable();
      return;
    }

    if (entitiesChanged) {
      this._handleEntitiesChanged();
    }
  }

  private async _handleEntitiesChanged() {
    this._renderEmptySortable = true;
    await this.updateComplete;
    const container = this.shadowRoot!.querySelector(".entities")!;
    while (container.lastElementChild) {
      container.removeChild(container.lastElementChild);
    }
    this._renderEmptySortable = false;
  }

  private async _createSortable() {
    const Sortable = await loadSortable();

    this._sortable = new Sortable(
      this.shadowRoot!.querySelector(".entities")!,
      {
        animation: 150,
        fallbackClass: "sortable-fallback",
        handle: ".handle",
        onEnd: async (evt: SortableEvent) => this._rowMoved(evt),
      }
    );
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

  private _rowMoved(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) {
      return;
    }

    const newEntities = this.entities!.concat();

    newEntities.splice(ev.newIndex!, 0, newEntities.splice(ev.oldIndex!, 1)[0]);

    fireEvent(this, "entities-changed", { entities: newEntities });
  }

  private _removeRow(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    const newConfigEntities = this.entities!.concat();

    newConfigEntities.splice(index, 1);

    fireEvent(this, "entities-changed", { entities: newConfigEntities });
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

  private _editRow(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    fireEvent(this, "edit-detail-element", {
      subElementConfig: {
        index,
        type: "row",
        elementConfig: this.entities![index],
      },
    });
  }

  static get styles(): CSSResultGroup {
    return [
      sortableStyles,
      css`
        ha-entity-picker {
          margin-top: 8px;
        }
        .add-entity {
          display: block;
          margin-left: 31px;
          margin-right: 71px;
          margin-inline-start: 31px;
          margin-inline-end: 71px;
          direction: var(--direction);
        }
        .entity {
          display: flex;
          align-items: center;
        }

        .entity .handle {
          padding-right: 8px;
          cursor: move;
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

        .special-row {
          height: 60px;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-grow: 1;
        }

        .special-row div {
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entities-card-row-editor": HuiEntitiesCardRowEditor;
  }
}
