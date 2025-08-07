import { mdiDeleteOutline, mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-button";
import "./ha-icon-button";
import "./ha-input-helper-text";
import "./ha-textfield";
import type { HaTextField } from "./ha-textfield";

@customElement("ha-multi-textfield")
class HaMultiTextField extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property({ type: Boolean }) public disabled = false;

  @property() public label?: string;

  @property({ attribute: false }) public helper?: string;

  @property({ attribute: false }) public inputType?: string;

  @property({ attribute: false }) public inputSuffix?: string;

  @property({ attribute: false }) public inputPrefix?: string;

  @property({ attribute: false }) public autocomplete?: string;

  @property({ attribute: false }) public addLabel?: string;

  @property({ attribute: false }) public removeLabel?: string;

  @property({ attribute: "item-index", type: Boolean })
  public itemIndex = false;

  protected render() {
    return html`
      ${this._items.map((item, index) => {
        const indexSuffix = `${this.itemIndex ? ` ${index + 1}` : ""}`;
        return html`
          <div class="layout horizontal center-center row">
            <ha-textfield
              .suffix=${this.inputSuffix}
              .prefix=${this.inputPrefix}
              .type=${this.inputType}
              .autocomplete=${this.autocomplete}
              .disabled=${this.disabled}
              dialogInitialFocus=${index}
              .index=${index}
              class="flex-auto"
              .label=${`${this.label ? `${this.label}${indexSuffix}` : ""}`}
              .value=${item}
              ?data-last=${index === this._items.length - 1}
              @input=${this._editItem}
              @keydown=${this._keyDown}
            ></ha-textfield>
            <ha-icon-button
              .disabled=${this.disabled}
              .index=${index}
              slot="navigationIcon"
              .label=${this.removeLabel ??
              this.hass?.localize("ui.common.remove") ??
              "Remove"}
              @click=${this._removeItem}
              .path=${mdiDeleteOutline}
            ></ha-icon-button>
          </div>
        `;
      })}
      <div class="layout horizontal">
        <ha-button
          size="small"
          appearance="filled"
          @click=${this._addItem}
          .disabled=${this.disabled}
        >
          <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
          ${this.addLabel ??
          (this.label
            ? this.hass?.localize("ui.components.multi-textfield.add_item", {
                item: this.label,
              })
            : this.hass?.localize("ui.common.add")) ??
          "Add"}
        </ha-button>
      </div>
      ${this.helper
        ? html`<ha-input-helper-text .disabled=${this.disabled}
            >${this.helper}</ha-input-helper-text
          >`
        : nothing}
    `;
  }

  private get _items() {
    return this.value ?? [];
  }

  private async _addItem() {
    const items = [...this._items, ""];
    this._fireChanged(items);
    await this.updateComplete;
    const field = this.shadowRoot?.querySelector(`ha-textfield[data-last]`) as
      | HaTextField
      | undefined;
    field?.focus();
  }

  private async _editItem(ev: Event) {
    const index = (ev.target as any).index;
    const items = [...this._items];
    items[index] = (ev.target as any).value;
    this._fireChanged(items);
  }

  private async _keyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.stopPropagation();
      this._addItem();
    }
  }

  private async _removeItem(ev: Event) {
    const index = (ev.target as any).index;
    const items = [...this._items];
    items.splice(index, 1);
    this._fireChanged(items);
  }

  private _fireChanged(value) {
    this.value = value;
    fireEvent(this, "value-changed", { value });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .row {
          margin-bottom: 8px;
        }
        ha-textfield {
          display: block;
        }
        ha-icon-button {
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-multi-textfield": HaMultiTextField;
  }
}
