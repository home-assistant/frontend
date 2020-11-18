import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button";
import { mdiChevronRight, mdiDragVerticalVariant } from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { guard } from "lit-html/directives/guard";
import type { SortableEvent } from "sortablejs";
import Sortable, {
  AutoScroll,
  OnSpill,
} from "sortablejs/modular/sortable.core.esm";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entity-picker";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import { sortableStyles } from "../../../resources/ha-sortable-style";
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

  @internalProperty() private _attached = false;

  @internalProperty() private _renderEmptySortable = false;

  private _sortable?: Sortable;

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
      <div class="title">
        <span>
          ${this.label ||
          `${this.hass!.localize(
            "ui.panel.lovelace.editor.card.generic.entities"
          )}:`}
        </span>
        <mwc-button label="Add Row" @click=${this._addEntity}></mwc-button>
      </div>
      <div class="entities">
        ${guard([this.entities, this._renderEmptySortable], () =>
          this._renderEmptySortable
            ? ""
            : this.entities!.map((entityConf, index) => {
                const stateObj = this.hass!.states[
                  (entityConf as EntityConfig).entity
                ];
                return html`
                  <ha-card
                    outlined
                    class="entity"
                    .index=${index}
                    @click=${this._editRow}
                  >
                    <ha-svg-icon
                      class="handle"
                      .path=${mdiDragVerticalVariant}
                    ></ha-svg-icon>
                    <div class="info">
                      <span class="primary">
                        ${entityConf.type
                          ? html`
                              ${this.hass!.localize(
                                `ui.panel.lovelace.editor.card.entities.entity_row.${entityConf.type}`
                              )}
                            `
                          : html`
                              ${(entityConf as EntityConfig).name ||
                              stateObj?.attributes.friendly_name ||
                              (entityConf as EntityConfig).entity}
                            `}
                      </span>
                      <span class="secondary">
                        ${entityConf.type
                          ? html`
                              ${this.hass!.localize(
                                "ui.panel.lovelace.editor.card.entities.edit_special_row"
                              )}
                            `
                          : html`
                              ${(entityConf as EntityConfig).entity}
                            `}</span
                      >
                    </div>
                    <ha-svg-icon
                      class="edit-icon"
                      .path=${mdiChevronRight}
                    ></ha-svg-icon>
                  </ha-card>
                `;
              })
        )}
      </div>
    `;
  }

  protected firstUpdated(): void {
    Sortable.mount(OnSpill);
    Sortable.mount(new AutoScroll());
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

  private _createSortable() {
    this._sortable = new Sortable(this.shadowRoot!.querySelector(".entities"), {
      animation: 150,
      fallbackClass: "sortable-fallback",
      handle: ".handle",
      onEnd: async (evt: SortableEvent) => this._rowMoved(evt),
    });
  }

  private async _addEntity(): Promise<void> {
    const newConfigEntities = this.entities!.concat({
      entity: " ",
    });
    fireEvent(this, "entities-changed", { entities: newConfigEntities });

    const index = newConfigEntities.length - 1;
    fireEvent(this, "edit-detail-element", {
      subElementConfig: {
        index,
        type: "row",
        elementConfig: this.entities![index],
      },
    });
  }

  private _rowMoved(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) {
      return;
    }

    const newEntities = this.entities!.concat();

    newEntities.splice(ev.newIndex!, 0, newEntities.splice(ev.oldIndex!, 1)[0]);

    fireEvent(this, "entities-changed", { entities: newEntities });
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

  static get styles(): CSSResult[] {
    return [
      sortableStyles,
      css`
        .title {
          font-size: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .entity {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          margin: 8px 0;
          cursor: pointer;
        }

        .handle {
          min-width: 18px;
          --mdc-icon-size: 18px;
          padding-right: 8px;
          cursor: move;
          color: var(--secondary-text-color);
        }

        .special-row {
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-grow: 1;
        }

        .info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          text-overflow: ellipsis;
          overflow: hidden;
          flex-grow: 1;
        }

        .edit-icon {
          min-width: 24px;
          color: var(--secondary-text-color);
        }

        .primary {
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .secondary {
          font-size: 12px;
          color: var(--secondary-text-color);
          text-overflow: ellipsis;
          overflow: hidden;
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
