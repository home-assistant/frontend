import "@home-assistant/webawesome/dist/components/popover/popover";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { ComboBoxLightOpenedChangedEvent } from "@vaadin/combo-box/vaadin-combo-box-light";
import { css, html, LitElement, nothing, type CSSResultGroup } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../common/dom/fire_event";
import type { HomeAssistant } from "../types";
import "./ha-bottom-sheet";
import "./ha-combo-box-item";
import "./ha-icon-button";
import "./ha-input-helper-text";
import "./ha-picker-combo-box";
import type {
  HaPickerComboBox,
  PickerComboBoxItem,
  PickerComboBoxSearchFn,
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
  public getAdditionalItems?: (searchString?: string) => PickerComboBoxItem[];

  @property({ attribute: false })
  public rowRenderer?: ComboBoxLitRenderer<PickerComboBoxItem>;

  @property({ attribute: false })
  public valueRenderer?: PickerValueRenderer;

  @property({ attribute: false })
  public searchFn?: PickerComboBoxSearchFn<PickerComboBoxItem>;

  @property({ attribute: "not-found-label", type: String })
  public notFoundLabel?: string;

  @query(".container") private _containerElement?: HTMLDivElement;

  @query("ha-picker-field") private _field?: HaPickerField;

  @query("ha-picker-combo-box") private _comboBox?: HaPickerComboBox;

  @state() private _opened = false;

  @state() private _pickerWrapperOpen = false;

  @state() private _narrow = false;

  @state() private _addTargetWidth = 0;

  protected render() {
    return html`
      ${this.label
        ? html`<label ?disabled=${this.disabled}>${this.label}</label>`
        : nothing}
      <div class="container">
        <ha-picker-field
          id="picker"
          type="button"
          compact
          aria-label=${ifDefined(this.label)}
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
        ${!this._narrow && (this._pickerWrapperOpen || this._opened)
          ? html`
              <wa-popover
                .open=${this._pickerWrapperOpen}
                style="--body-width: ${this._addTargetWidth}px;"
                without-arrow
                distance="-4"
                placement="bottom-start"
                for="picker"
                auto-size="vertical"
                auto-size-padding="16"
                @wa-after-show=${this._dialogOpened}
                @wa-after-hide=${this._hidePicker}
                trap-focus
                role="dialog"
                aria-modal="true"
                aria-label=${this.hass.localize(
                  "ui.components.target-picker.add_target"
                )}
              >
                ${this._renderComboBox()}
              </wa-popover>
            `
          : this._pickerWrapperOpen || this._opened
            ? html`<ha-bottom-sheet
                flexcontent
                .open=${this._pickerWrapperOpen}
                @wa-after-show=${this._dialogOpened}
                @closed=${this._hidePicker}
                role="dialog"
                aria-modal="true"
                aria-label=${this.hass.localize(
                  "ui.components.target-picker.add_target"
                )}
              >
                ${this._renderComboBox(true)}
              </ha-bottom-sheet>`
            : nothing}
      </div>
      ${this._renderHelper()}
    `;
  }

  private _renderComboBox(dialogMode = false) {
    if (!this._opened) {
      return nothing;
    }
    return html`
      <ha-picker-combo-box
        .hass=${this.hass}
        .autofocus=${this.autofocus}
        .allowCustomValue=${this.allowCustomValue}
        .label=${this.searchLabel ?? this.hass.localize("ui.common.search")}
        .value=${this.value}
        hide-clear-icon
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
        .rowRenderer=${this.rowRenderer}
        .notFoundLabel=${this.notFoundLabel}
        .getItems=${this.getItems}
        .getAdditionalItems=${this.getAdditionalItems}
        .searchFn=${this.searchFn}
        .mode=${dialogMode ? "dialog" : "popover"}
      ></ha-picker-combo-box>
    `;
  }

  private _renderHelper() {
    return this.helper
      ? html`<ha-input-helper-text .disabled=${this.disabled}
          >${this.helper}</ha-input-helper-text
        >`
      : nothing;
  }

  private _dialogOpened = () => {
    this._opened = true;
    this._comboBox?.focus();
    this._comboBox?.open();
    if (this.autofocus) {
      requestAnimationFrame(() => {
        this._comboBox?.focus();
      });
    }
  };

  private _hidePicker(ev) {
    ev.stopPropagation();
    this._opened = false;
    this._pickerWrapperOpen = false;
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
    this._addTargetWidth = this._containerElement?.offsetWidth || 0;
    this._pickerWrapperOpen = true;
  }

  private async _openedChanged(ev: ComboBoxLightOpenedChangedEvent) {
    const opened = ev.detail.value;
    if (this._opened && !opened) {
      this._opened = false;
      await this.updateComplete;
      this._field?.focus();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._handleResize();
    window.addEventListener("resize", this._handleResize);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._handleResize);
  }

  private _handleResize = () => {
    this._narrow =
      window.matchMedia("(max-width: 870px)").matches ||
      window.matchMedia("(max-height: 500px)").matches;
  };

  static get styles(): CSSResultGroup {
    return [
      css`
        .container {
          position: relative;
          display: block;
        }
        label[disabled] {
          color: var(--mdc-text-field-disabled-ink-color, rgba(0, 0, 0, 0.6));
        }
        label {
          display: block;
          margin: 0 0 8px;
        }
        ha-input-helper-text {
          display: block;
          margin: 8px 0 0;
        }

        wa-popover {
          --wa-space-l: var(--ha-space-0);
        }

        wa-popover::part(body) {
          width: min(max(var(--body-width), 336px), 600px);
          max-width: min(max(var(--body-width), 336px), 600px);
          max-height: 500px;
          height: 70vh;
          overflow: hidden;
        }

        @media (max-height: 1000px) {
          wa-popover::part(body) {
            max-height: 400px;
          }
        }

        ha-bottom-sheet {
          --ha-bottom-sheet-height: 90vh;
          --ha-bottom-sheet-height: calc(100dvh - var(--ha-space-12));
          --ha-bottom-sheet-max-height: var(--ha-bottom-sheet-height);
          --ha-bottom-sheet-max-width: 600px;
          --ha-bottom-sheet-padding: var(--ha-space-0);
          --ha-bottom-sheet-surface-background: var(--card-background-color);
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
