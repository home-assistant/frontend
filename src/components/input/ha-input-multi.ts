import { consume, type ContextType } from "@lit/context";
import { mdiDeleteOutline, mdiDragHorizontalVariant, mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../common/dom/fire_event";
import { localizeContext } from "../../data/context";
import { haStyle } from "../../resources/styles";
import "../ha-button";
import "../ha-icon-button";
import "../ha-input-helper-text";
import "../ha-sortable";
import "./ha-input";
import type { HaInput, InputType } from "./ha-input";

@customElement("ha-input-multi")
class HaMultiTextField extends LitElement {
  @property({ attribute: false }) public value?: string[];

  @property({ type: Boolean }) public disabled = false;

  @property() public label?: string;

  @property({ attribute: false }) public helper?: string;

  @property({ attribute: false }) public inputType?: InputType;

  @property({ attribute: false }) public inputSuffix?: string;

  @property({ attribute: false }) public inputPrefix?: string;

  @property({ attribute: false }) public autocomplete?: string;

  @property({ attribute: false }) public addLabel?: string;

  @property({ attribute: false }) public removeLabel?: string;

  @property({ attribute: "item-index", type: Boolean })
  public itemIndex = false;

  @property({ type: Number }) public max?: number;

  @property({ type: Boolean }) public sortable = false;

  @property({ type: Boolean, attribute: "update-on-blur" })
  public updateOnBlur = false;

  @state()
  @consume({ context: localizeContext, subscribe: true })
  private localize?: ContextType<typeof localizeContext>;

  protected render() {
    return html`
      <ha-sortable
        handle-selector=".handle"
        draggable-selector=".row"
        .disabled=${!this.sortable || this.disabled}
        @item-moved=${this._itemMoved}
      >
        <div class="items">
          ${repeat(
            this._items,
            (item, index) => `${item}-${index}`,
            (item, index) => {
              const indexSuffix = `${this.itemIndex ? ` ${index + 1}` : ""}`;
              return html`
                <div class="layout horizontal center-center row">
                  <ha-input
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
                    @change=${this._editItem}
                    @keydown=${this._keyDown}
                  >
                    ${this.inputSuffix
                      ? html`<span slot="suffix">${this.inputSuffix}</span>`
                      : nothing}
                    ${this.inputPrefix
                      ? html`<span slot="prefix">${this.inputPrefix}</span>`
                      : nothing}
                  </ha-input>
                  <ha-icon-button
                    .disabled=${this.disabled}
                    .index=${index}
                    slot="navigationIcon"
                    .label=${this.removeLabel ??
                    this.localize?.("ui.common.remove") ??
                    "Remove"}
                    @click=${this._removeItem}
                    .path=${mdiDeleteOutline}
                  ></ha-icon-button>
                  ${this.sortable
                    ? html`<ha-svg-icon
                        class="handle"
                        .path=${mdiDragHorizontalVariant}
                      ></ha-svg-icon>`
                    : nothing}
                </div>
              `;
            }
          )}
        </div>
      </ha-sortable>
      <div class="layout horizontal">
        <ha-button
          size="small"
          appearance="filled"
          @click=${this._addItem}
          .disabled=${this.disabled ||
          (this.max != null && this._items.length >= this.max)}
        >
          <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
          ${this.addLabel ??
          (this.label
            ? this.localize?.("ui.components.multi-textfield.add_item", {
                item: this.label,
              })
            : this.localize?.("ui.common.add")) ??
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
    if (this.max != null && this._items.length >= this.max) {
      return;
    }
    const items = [...this._items, ""];
    this._fireChanged(items);
    await this.updateComplete;
    const field = this.shadowRoot?.querySelector(`ha-input[data-last]`) as
      | HaInput
      | undefined;
    field?.focus();
  }

  private async _editItem(ev: Event) {
    if (this.updateOnBlur && ev.type === "input") {
      return;
    }
    if (!this.updateOnBlur && ev.type === "change") {
      return;
    }
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

  private _itemMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const items = [...this._items];
    const [moved] = items.splice(oldIndex, 1);
    items.splice(newIndex, 0, moved);
    this._fireChanged(items);
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
          --ha-input-padding-bottom: 0;
        }
        ha-icon-button {
          display: block;
        }
        .handle {
          cursor: grab;
          padding: 8px;
          margin: -8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-input-multi": HaMultiTextField;
  }
}
