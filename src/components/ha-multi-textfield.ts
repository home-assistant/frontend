import { mdiDeleteOutline, mdiPlus } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-button";
import "./ha-textfield";
import type { HaTextField } from "./ha-textfield";

@customElement("ha-multi-textfield")
class HaMultiTextField extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public value?: string[];

  @property({ type: Boolean }) public disabled = false;

  @property() public label?: string;

  @property() public inputType?: string;

  @property() public inputSuffix?: string;

  @property() public inputPrefix?: string;

  @property() public autocomplete?: string;

  @property() public addLabel?: string;

  @property() public removeLabel?: string;

  @property({ attribute: "item-index", type: Boolean })
  public itemIndex?: boolean;

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
      <div class="layout horizontal center-center">
        <ha-button @click=${this._addItem} .disabled=${this.disabled}>
          ${this.addLabel ?? this.hass?.localize("ui.common.add") ?? "Add"}
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </ha-button>
      </div>
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
        ha-button {
          margin-left: 8px;
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
