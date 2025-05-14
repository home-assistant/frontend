import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { ComboBoxLightOpenedChangedEvent } from "@vaadin/combo-box/vaadin-combo-box-light";
import { css, html, LitElement, nothing, type CSSResultGroup } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { HomeAssistant } from "../types";
import "./ha-combo-box-item";
import "./ha-icon-button";
import "./ha-input-helper-text";
import "./ha-picker-combo-box";
import type {
  HaPickerComboBox,
  PickerComboBoxItem,
} from "./ha-picker-combo-box";
import "./ha-picker-field";
import type { HaPickerField, PickerValueRenderer } from "./ha-picker-field";
import "./ha-svg-icon";

@customElement("ha-generic-picker")
export class HaGenericPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  // eslint-disable-next-line lit/no-native-attributes
  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "allow-custom-value" })
  public allowCustomValue;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: String, attribute: "search-label" })
  public searchLabel?: string;

  @property({ attribute: "hide-clear-icon", type: Boolean })
  public hideClearIcon = false;

  @property({ attribute: false, type: Array })
  public getItems?: () => PickerComboBoxItem[];

  @property({ attribute: false, type: Array })
  public getAdditionalItems?: (searchString: string) => PickerComboBoxItem[];

  @property({ attribute: false })
  public rowRenderer?: ComboBoxLitRenderer<PickerComboBoxItem>;

  @property({ attribute: false })
  public valueRenderer?: PickerValueRenderer;

  @property({ attribute: "not-found-label", type: String })
  public notFoundLabel?: string;

  @query("ha-picker-field") private _field?: HaPickerField;

  @query("ha-picker-combo-box") private _comboBox?: HaPickerComboBox;

  @state() private _opened = false;

  protected render() {
    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <div class="container">
        ${!this._opened
          ? html`
              <ha-picker-field
                type="button"
                compact
                @click=${this.open}
                @clear=${this._clear}
                .placeholder=${this.placeholder}
                .value=${this.value}
                .required=${this.required}
                .disabled=${this.disabled}
                .hideClearIcon=${this.hideClearIcon}
                .valueRenderer=${this.valueRenderer}
              >
              </ha-picker-field>
            `
          : html`
              <ha-picker-combo-box
                .hass=${this.hass}
                .autofocus=${this.autofocus}
                .allowCustomValue=${this.allowCustomValue}
                .label=${this.searchLabel ??
                this.hass.localize("ui.common.search")}
                .value=${this.value}
                hide-clear-icon
                @opened-changed=${this._openedChanged}
                @value-changed=${this._valueChanged}
                .rowRenderer=${this.rowRenderer}
                .notFoundLabel=${this.notFoundLabel}
                .getItems=${this.getItems}
                .getAdditionalItems=${this.getAdditionalItems}
              ></ha-picker-combo-box>
            `}
        ${this._renderHelper()}
      </div>
    `;
  }

  private _renderHelper() {
    return this.helper
      ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
      : nothing;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;
    if (!value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }

  private _clear(e) {
    e.stopPropagation();
    this._setValue(undefined);
  }

  private _setValue(value: string | undefined) {
    this.value = value;
    fireEvent(this, "value-changed", { value });
  }

  public async open() {
    if (this.disabled) {
      return;
    }
    this._opened = true;
    await this.updateComplete;
    this._comboBox?.focus();
    this._comboBox?.open();
  }

  private async _openedChanged(ev: ComboBoxLightOpenedChangedEvent) {
    const opened = ev.detail.value;
    if (this._opened && !opened) {
      this._opened = false;
      await this.updateComplete;
      this._field?.focus();
    }
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .container {
          position: relative;
          display: block;
        }
        label {
          display: block;
          margin: 0 0 8px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-generic-picker": HaGenericPicker;
  }
}
