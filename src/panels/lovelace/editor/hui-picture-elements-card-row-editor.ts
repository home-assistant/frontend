import { mdiClose, mdiContentDuplicate, mdiPencil } from "@mdi/js";
import deepClone from "deep-clone-simple";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-select";
import type { HaSelect } from "../../../components/ha-select";
import "../../../components/ha-svg-icon";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../types";
import type {
  ConditionalElementConfig,
  IconElementConfig,
  ImageElementConfig,
  LovelaceElementConfig,
  ServiceButtonElementConfig,
  StateBadgeElementConfig,
  StateIconElementConfig,
  StateLabelElementConfig,
} from "../elements/types";
import { getElementStubConfig } from "./get-element-stub-config";

declare global {
  interface HASSDomEvents {
    "elements-changed": {
      elements: any[];
    };
  }
}

const elementTypes: string[] = [
  "state-badge",
  "state-icon",
  "state-label",
  "action-button",
  "icon",
  "image",
  "conditional",
];

@customElement("hui-picture-elements-card-row-editor")
export class HuiPictureElementsCardRowEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public elements?: LovelaceElementConfig[];

  @query("ha-select") private _select!: HaSelect;

  protected render() {
    if (!this.elements || !this.hass) {
      return nothing;
    }

    return html`
      <h3>
        ${this.hass.localize(
          "ui.panel.lovelace.editor.card.picture-elements.elements"
        )}
      </h3>
      <div class="elements">
        ${this.elements.map(
          (element, index) => html`
            <div class="element">
              ${element.type
                ? html`
                    <div class="element-row">
                      <div>
                        <span>
                          ${this.hass?.localize(
                            `ui.panel.lovelace.editor.card.picture-elements.element_types.${element.type}`
                          ) || element.type}
                        </span>
                        <span class="secondary"
                          >${this._getSecondaryDescription(element)}</span
                        >
                      </div>
                    </div>
                  `
                : nothing}
              <ha-icon-button
                .label=${this.hass!.localize("ui.common.delete")}
                .path=${mdiClose}
                class="remove-icon"
                .index=${index}
                @click=${this._removeRow}
              ></ha-icon-button>
              <ha-icon-button
                .label=${this.hass!.localize("ui.common.edit")}
                .path=${mdiPencil}
                class="edit-icon"
                .index=${index}
                @click=${this._editRow}
              ></ha-icon-button>
              <ha-icon-button
                .label=${this.hass!.localize("ui.common.duplicate")}
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
          .label=${this.hass.localize(
            "ui.panel.lovelace.editor.card.picture-elements.new_element"
          )}
          .value=${""}
          @closed=${stopPropagation}
          @selected=${this._addElement}
        >
          ${elementTypes.map(
            (element) => html`
              <ha-list-item .value=${element}
                >${this.hass?.localize(
                  `ui.panel.lovelace.editor.card.picture-elements.element_types.${element}`
                )}</ha-list-item
              >
            `
          )}
        </ha-select>
      </div>
    `;
  }

  private _getSecondaryDescription(element: LovelaceElementConfig): string {
    switch (element.type) {
      case "icon":
        return element.title ?? (element as IconElementConfig).icon ?? "";
      case "state-badge":
      case "state-icon":
      case "state-label":
        return (
          element.title ??
          (
            element as
              | StateBadgeElementConfig
              | StateIconElementConfig
              | StateLabelElementConfig
          ).entity ??
          ""
        );
      case "action-button":
      case "service-button":
        return (
          element.title ??
          (element as ServiceButtonElementConfig).action ??
          (element as ServiceButtonElementConfig).service ??
          ""
        );
      case "image":
        return (
          element.title ??
          (element as ImageElementConfig).image ??
          (element as ImageElementConfig).camera_image ??
          ""
        );
      case "conditional":
        return (
          element.title ??
          `${((element as ConditionalElementConfig).elements || []).length.toString()} ${this.hass?.localize("ui.panel.lovelace.editor.card.picture-elements.elements")}`
        );
    }
    return element.title ?? "Unknown type";
  }

  private async _addElement(ev): Promise<void> {
    const value = ev.target!.value;
    if (value === "") {
      return;
    }
    const newElements = this.elements!.concat(
      await getElementStubConfig(
        this.hass!,
        value,
        Object.keys(this.hass!.entities),
        []
      )
    );
    fireEvent(this, "elements-changed", { elements: newElements });
    this._select.select(-1);
  }

  private _removeRow(ev: CustomEvent): void {
    const index = (ev.currentTarget as any).index;
    const element = this.elements?.[index];
    if (!element) {
      return;
    }
    showConfirmationDialog(this, {
      text: this.hass!.localize(
        "ui.panel.lovelace.editor.card.picture-elements.confirm_delete_element",
        {
          type:
            this.hass!.localize(
              `ui.panel.lovelace.editor.card.picture-elements.element_types.${element.type}`
            ) || element.type,
        }
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      destructive: true,
      confirm: () => {
        const newElements = this.elements!.concat();
        newElements.splice(index, 1);
        fireEvent(this, "elements-changed", { elements: newElements });
      },
    });
  }

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
    const newElements = [...this.elements!, deepClone(this.elements![index])];

    fireEvent(this, "elements-changed", { elements: newElements });
  }

  static styles = css`
    .element {
      display: flex;
      align-items: center;
    }

    .element-row {
      height: 60px;
      font-size: var(--ha-font-size-l);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-grow: 1;
    }

    .element-row div {
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
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
    }

    ha-select {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-elements-card-row-editor": HuiPictureElementsCardRowEditor;
  }
}
