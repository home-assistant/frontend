import "@material/mwc-icon-button";
import { mdiArrowLeft, mdiClose, mdiDrag, mdiPencil } from "@mdi/js";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import { guard } from "lit-html/directives/guard";
import type { SortableEvent } from "sortablejs";
import Sortable, {
  AutoScroll,
  OnSpill,
} from "sortablejs/modular/sortable.core.esm";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/ha-entity-picker";
import type { HaEntityPicker } from "../../../components/entity/ha-entity-picker";
import "../../../components/ha-svg-icon";
import { sortableStyles } from "../../../resources/ha-sortable-style";
import { HomeAssistant } from "../../../types";
import { EntityConfig, LovelaceRowConfig } from "../entity-rows/types";
import "./hui-entity-row-editor";
import type { HuiEntityRowEditor } from "./hui-entity-row-editor";
import { GUIModeChangedEvent } from "./types";

@customElement("hui-entities-card-row-editor")
export class HuiEntitiesCardRowEditor extends LitElement {
  @property({ attribute: false }) protected hass?: HomeAssistant;

  @property({ attribute: false }) protected entities?: LovelaceRowConfig[];

  @property() protected label?: string;

  @internalProperty() private _attached = false;

  @internalProperty() private _renderEmptySortable = false;

  @internalProperty() private _editRowConfig?: LovelaceRowConfig;

  @internalProperty() private _editRowIndex?: number;

  @internalProperty() private _editRowGuiModeAvailable? = true;

  @internalProperty() private _editRowGuiMode = true;

  @query("hui-entity-row-editor") private _cardEditorEl?: HuiEntityRowEditor;

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

    if (this._editRowConfig) {
      return html`
        <div class="edit-entity-row-header">
          <mwc-icon-button @click=${this._goBack}>
            <ha-svg-icon .path=${mdiArrowLeft}></ha-svg-icon>
          </mwc-icon-button>
          <mwc-button
            slot="secondaryAction"
            @click=${this._toggleMode}
            .disabled=${!this._editRowGuiModeAvailable}
            class="gui-mode-button"
          >
            ${this.hass!.localize(
              !this._cardEditorEl || this._editRowGuiMode
                ? "ui.panel.lovelace.editor.edit_card.show_code_editor"
                : "ui.panel.lovelace.editor.edit_card.show_visual_editor"
            )}
          </mwc-button>
        </div>
        <hui-entity-row-editor
          .hass=${this.hass}
          .value=${this._editRowConfig}
          @row-config-changed=${this._handleEntityRowConfigChanged}
          @GUImode-changed=${this._handleGUIModeChanged}
        ></hui-entity-row-editor>
      `;
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
            : this.entities!.map((entityConf, index) => {
                return html`
                  <div class="entity">
                    <ha-svg-icon class="handle" .path=${mdiDrag}></ha-svg-icon>
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
                            <mwc-icon-button
                              aria-label=${this.hass!.localize(
                                "ui.components.entity.entity-picker.clear"
                              )}
                              .index=${index}
                              @click=${this._removeSpecialRow}
                            >
                              <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
                            </mwc-icon-button>
                          </div>
                        `
                      : html`
                          <ha-entity-picker
                            allow-custom-entity
                            .hass=${this.hass}
                            .value=${(entityConf as EntityConfig).entity}
                            .index=${index}
                            @value-changed=${this._valueChanged}
                          ></ha-entity-picker>
                        `}
                    <mwc-icon-button
                      aria-label=${this.hass!.localize(
                        "ui.components.entity.entity-picker.edit"
                      )}
                      class="edit-icon"
                      .index=${index}
                      @click=${this._editRow}
                    >
                      <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                    </mwc-icon-button>
                  </div>
                `;
              })
        )}
      </div>
      <ha-entity-picker
        .hass=${this.hass}
        @value-changed=${this._addEntity}
      ></ha-entity-picker>
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
    while (!this._editRowConfig && container.lastElementChild) {
      container.removeChild(container.lastElementChild);
    }
    this._renderEmptySortable = false;
  }

  private _createSortable() {
    this._sortable = new Sortable(this.shadowRoot!.querySelector(".entities"), {
      animation: 150,
      fallbackClass: "sortable-fallback",
      handle: ".handle",
      onEnd: async (evt: SortableEvent) => this._entityMoved(evt),
    });
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

  private _entityMoved(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) {
      return;
    }

    const newEntities = this.entities!.concat();

    newEntities.splice(ev.newIndex!, 0, newEntities.splice(ev.oldIndex!, 1)[0]);

    fireEvent(this, "entities-changed", { entities: newEntities });
  }

  private _removeSpecialRow(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    const newConfigEntities = this.entities!.concat();

    newConfigEntities.splice(index, 1);

    fireEvent(this, "entities-changed", { entities: newConfigEntities });
  }

  private _valueChanged(ev: CustomEvent): void {
    const value = ev.detail.value;
    const index = (ev.target as any).index;
    const newConfigEntities = this.entities!.concat();

    if (value === "") {
      newConfigEntities.splice(index, 1);
    } else {
      newConfigEntities[index] = {
        ...newConfigEntities[index],
        entity: value!,
      };
    }

    fireEvent(this, "entities-changed", { entities: newConfigEntities });
  }

  private _handleEntityRowConfigChanged(ev: CustomEvent): void {
    const value = ev.detail.config as LovelaceRowConfig;
    this._editRowGuiModeAvailable = ev.detail.guiModeAvailable;

    const newConfigEntities = this.entities!.concat();

    if (!value) {
      newConfigEntities.splice(this._editRowIndex!, 1);
      this._goBack();
    } else {
      newConfigEntities[this._editRowIndex!] = value;
    }

    this._editRowConfig = value;

    fireEvent(this, "entities-changed", { entities: newConfigEntities });
  }

  private _handleGUIModeChanged(ev: HASSDomEvent<GUIModeChangedEvent>): void {
    ev.stopPropagation();
    this._editRowGuiMode = ev.detail.guiMode;
    this._editRowGuiModeAvailable = ev.detail.guiModeAvailable;
  }

  private _editRow(ev: CustomEvent): void {
    this._editRowIndex = (ev.currentTarget as any).index;
    this._editRowConfig = this.entities![this._editRowIndex!];
    fireEvent(this, "edit-row", { editting: true });
  }

  private _goBack(): void {
    this._editRowIndex = undefined;
    this._editRowConfig = undefined;
    fireEvent(this, "edit-row", { editting: false });
  }

  private _toggleMode(): void {
    this._cardEditorEl?.toggleMode();
  }

  static get styles(): CSSResult[] {
    return [
      sortableStyles,
      css`
        .entity {
          display: flex;
          align-items: center;
        }
        .entity .handle {
          padding-right: 8px;
          cursor: move;
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

        .special-row mwc-icon-button,
        .edit-icon {
          --mdc-icon-button-size: 36px;
          color: var(--secondary-text-color);
        }

        .edit-entity-row-header {
          display: flex;
          justify-content: space-between;
          align-self: center;
        }
        .edit-entity-row-header mwc-button {
          display: flex;
          align-items: center;
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
