import { mdiClose, mdiPencil, mdiContentDuplicate } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import { HomeAssistant } from "../../../types";
import "../../../components/ha-select";
import type { HaSelect } from "../../../components/ha-select";

declare global {
  interface HASSDomEvents {
    "elements-changed": {
      elements: any[];
    };
  }
}

@customElement("hui-picture-elements-card-row-editor")
export class HuiPictureElementsCardRowEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public elements?: any[];

  @property() public label?: string;

  @query("ha-select") private _select!: HaSelect;

  protected render() {
    if (!this.elements || !this.hass) {
      return nothing;
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
        ${this.elements.map(
          (element, index) => html`
            <div class="entity">
              ${element.type
                ? html`
                    <div class="special-row">
                      <div>
                        <span>
                          ${`${element.type} ${element.entity ?? ""} ${element.title ?? ""}`}
                        </span>
                        <span class="secondary"
                          >${this.hass!.localize(
                            "ui.panel.lovelace.editor.card.entities.edit_special_row"
                          )}</span
                        >
                      </div>
                    </div>
                  `
                : nothing}
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
              <ha-icon-button
                .label=${"Duplicate"}
                .path=${mdiContentDuplicate}
                class="duplicate-icon"
                .index=${index}
                @click=${this._duplicateRow}
              ></ha-icon-button>
            </div>
          `
        )}
        <ha-select
          fixedMenuPosition
          naturalMenuWidth
          .label=${this.label ?? "Add new Element"}
          .value=${""}
          .helper=${""}
          @closed=${stopPropagation}
          @selected=${this._addEntity}
        >
          <mwc-list-item .value=${"state-badge"}>State Badge</mwc-list-item>
          <mwc-list-item .value=${"state-icon"}>State Icon</mwc-list-item>
        </ha-select>
      </div>
    `;
  }

  private async _addEntity(ev): Promise<void> {
    const value = ev.target!.value;
    if (value === "") {
      return;
    }
    const newElements = this.elements!.concat({
      type: value as string,
    });
    fireEvent(this, "elements-changed", { elements: newElements });
    this._select.select(-1);
  }

  private _removeRow(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    const newElements = this.elements!.concat();

    newElements.splice(index, 1);

    fireEvent(this, "elements-changed", { elements: newElements });
  }

  // private _valueChanged(ev: CustomEvent): void {
  //   const value = ev.detail.value;
  //   const index = (ev.target as any).index;
  //   const newConfigEntities = this.elements!.concat();

  //   if (value === "" || value === undefined) {
  //     newConfigEntities.splice(index, 1);
  //   } else {
  //     newConfigEntities[index] = {
  //       ...newConfigEntities[index],
  //       entity: value!,
  //     };
  //   }

  //   fireEvent(this, "elements-changed", { elements: newConfigEntities });
  // }

  private _editRow(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    fireEvent(this, "edit-detail-element", {
      subElementConfig: {
        index,
        type: "element",
        elementConfig: this.elements![index],
      },
    });
  }
  private _duplicateRow(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    const newElements = [...this.elements!, this.elements![index]];

    fireEvent(this, "elements-changed", { elements: newElements });
  }

  static get styles(): CSSResultGroup {
    return css`
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
      .edit-icon,
      .duplicate-icon {
        --mdc-icon-button-size: 36px;
        color: var(--secondary-text-color);
      }

      .secondary {
        font-size: 12px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-elements-card-row-editor": HuiPictureElementsCardRowEditor;
  }
}
