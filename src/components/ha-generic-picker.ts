import "@home-assistant/webawesome/dist/components/popover/popover";
import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { mdiPlaylistPlus } from "@mdi/js";
import { css, html, LitElement, nothing, type CSSResultGroup } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { tinykeys } from "tinykeys";
import { fireEvent } from "../common/dom/fire_event";
import type { FuseWeightedKey } from "../resources/fuseMultiTerm";
import type { HomeAssistant } from "../types";
import "./ha-bottom-sheet";
import "./ha-button";
import "./ha-combo-box-item";
import "./ha-input-helper-text";
import "./ha-picker-combo-box";
import type {
  HaPickerComboBox,
  PickerComboBoxItem,
  PickerComboBoxSearchFn,
} from "./ha-picker-combo-box";
import "./ha-picker-field";
import type { PickerValueRenderer } from "./ha-picker-field";
import "./ha-svg-icon";

@customElement("ha-generic-picker")
export class HaGenericPicker extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "allow-custom-value" })
  public allowCustomValue;

  @property() public value?: string;

  @property() public icon?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: String, attribute: "search-label" })
  public searchLabel?: string;

  @property({ attribute: "hide-clear-icon", type: Boolean })
  public hideClearIcon = false;

  @property({ attribute: "show-label", type: Boolean })
  public showLabel = false;

  /** To prevent lags, getItems needs to be memoized */
  @property({ attribute: false })
  public getItems!: (
    searchString?: string,
    section?: string
  ) => (PickerComboBoxItem | string)[];

  @property({ attribute: false, type: Array })
  public getAdditionalItems?: (searchString?: string) => PickerComboBoxItem[];

  @property({ attribute: false })
  public rowRenderer?: RenderItemFunction<PickerComboBoxItem>;

  @property({ attribute: false })
  public valueRenderer?: PickerValueRenderer;

  @property({ attribute: false })
  public searchFn?: PickerComboBoxSearchFn<PickerComboBoxItem>;

  @property({ attribute: false })
  public searchKeys?: FuseWeightedKey[];

  @property({ attribute: false })
  public notFoundLabel?: string | ((search: string) => string);

  @property({ attribute: "empty-label" })
  public emptyLabel?: string;

  @property({ attribute: "popover-placement" })
  public popoverPlacement:
    | "bottom"
    | "top"
    | "left"
    | "right"
    | "top-start"
    | "top-end"
    | "right-start"
    | "right-end"
    | "bottom-start"
    | "bottom-end"
    | "left-start"
    | "left-end" = "bottom-start";

  /** If set picker shows an add button instead of textbox when value isn't set */
  @property({ attribute: "add-button-label" }) public addButtonLabel?: string;

  /** Section filter buttons for the list, section headers needs to be defined in getItems as strings */
  @property({ attribute: false }) public sections?: (
    | {
        id: string;
        label: string;
      }
    | "separator"
  )[];

  @property({ attribute: false }) public sectionTitleFunction?: (listInfo: {
    firstIndex: number;
    lastIndex: number;
    firstItem: PickerComboBoxItem | string;
    secondItem: PickerComboBoxItem | string;
    itemsCount: number;
  }) => string | undefined;

  @property({ attribute: "selected-section" }) public selectedSection?: string;

  @property({ attribute: "unknown-item-text" }) public unknownItemText?: string;

  @query(".container") private _containerElement?: HTMLDivElement;

  @query("ha-picker-combo-box") private _comboBox?: HaPickerComboBox;

  @state() private _opened = false;

  @state() private _pickerWrapperOpen = false;

  @state() private _popoverWidth = 0;

  @state() private _openedNarrow = false;

  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  private _narrow = false;

  // helper to set new value after closing picker, to avoid flicker
  private _newValue?: string;

  @property({ attribute: "error-message" }) public errorMessage?: string;

  @property({ type: Boolean, reflect: true }) public invalid = false;

  private _unsubscribeTinyKeys?: () => void;

  protected render() {
    return html`
      ${this.label
        ? html`<label ?disabled=${this.disabled}>${this.label}</label>`
        : nothing}
      <div class="container">
        <div id="picker">
          <slot name="field">
            ${this.addButtonLabel && !this.value
              ? html`<ha-button
                  size="small"
                  appearance="filled"
                  @click=${this.open}
                  .disabled=${this.disabled}
                >
                  <ha-svg-icon
                    .path=${mdiPlaylistPlus}
                    slot="start"
                  ></ha-svg-icon>
                  ${this.addButtonLabel}
                </ha-button>`
              : html`<ha-picker-field
                  type="button"
                  class=${this._opened ? "opened" : ""}
                  compact
                  .unknown=${this._unknownValue(this.value, this.getItems())}
                  .unknownItemText=${this.unknownItemText}
                  aria-label=${ifDefined(this.label)}
                  @click=${this.open}
                  @clear=${this._clear}
                  .icon=${this.icon}
                  .showLabel=${this.showLabel}
                  .placeholder=${this.placeholder}
                  .value=${this.value}
                  .valueRenderer=${this.valueRenderer}
                  .required=${this.required}
                  .disabled=${this.disabled}
                  .invalid=${this.invalid}
                  .hideClearIcon=${this.hideClearIcon}
                >
                </ha-picker-field>`}
          </slot>
        </div>
        ${!this._openedNarrow && (this._pickerWrapperOpen || this._opened)
          ? html`
              <wa-popover
                .open=${this._pickerWrapperOpen}
                style="--body-width: ${this._popoverWidth}px;"
                without-arrow
                distance="-4"
                .placement=${this.popoverPlacement}
                for="picker"
                auto-size="vertical"
                auto-size-padding="16"
                @wa-after-show=${this._dialogOpened}
                @wa-after-hide=${this._hidePicker}
                trap-focus
                role="dialog"
                aria-modal="true"
                aria-label=${this.label || "Select option"}
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
                aria-label=${this.label || "Select option"}
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
        .allowCustomValue=${this.allowCustomValue}
        .label=${this.searchLabel}
        .value=${this.value}
        @value-changed=${this._valueChanged}
        .rowRenderer=${this.rowRenderer}
        .notFoundLabel=${this.notFoundLabel}
        .emptyLabel=${this.emptyLabel}
        .getItems=${this.getItems}
        .getAdditionalItems=${this.getAdditionalItems}
        .searchFn=${this.searchFn}
        .mode=${dialogMode ? "dialog" : "popover"}
        .sections=${this.sections}
        .sectionTitleFunction=${this.sectionTitleFunction}
        .selectedSection=${this.selectedSection}
        .searchKeys=${this.searchKeys}
      ></ha-picker-combo-box>
    `;
  }

  private _unknownValue = memoizeOne(
    (value?: string, items?: (PickerComboBoxItem | string)[]) => {
      if (value === undefined || value === null || value === "" || !items) {
        return false;
      }

      return !items.some(
        (item) => typeof item !== "string" && item.id === value
      );
    }
  );

  private _renderHelper() {
    const showError = this.invalid && this.errorMessage;
    const showHelper = !showError && this.helper;

    if (!showError && !showHelper) {
      return nothing;
    }

    return html`<ha-input-helper-text .disabled=${this.disabled}>
      ${showError ? this.errorMessage : this.helper}
    </ha-input-helper-text>`;
  }

  private _dialogOpened = () => {
    this._opened = true;
    requestAnimationFrame(() => {
      this._comboBox?.focus();
    });
  };

  private _hidePicker(ev: Event) {
    ev.stopPropagation();
    if (this._newValue) {
      fireEvent(this, "value-changed", { value: this._newValue });
      this._newValue = undefined;
    }

    this._opened = false;
    this._pickerWrapperOpen = false;
    this._unsubscribeTinyKeys?.();
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = ev.detail.value;
    if (!value) {
      return;
    }
    this._pickerWrapperOpen = false;
    this._newValue = value;
  }

  private _clear(e) {
    e.stopPropagation();
    this._setValue(undefined);
  }

  private _setValue(value: string | undefined) {
    this.value = value;
    fireEvent(this, "value-changed", { value });
  }

  public async open(ev?: Event) {
    ev?.stopPropagation();
    if (this.disabled) {
      return;
    }
    this._openedNarrow = this._narrow;
    this._popoverWidth = this._containerElement?.offsetWidth || 250;
    this._pickerWrapperOpen = true;
    this._unsubscribeTinyKeys = tinykeys(this, {
      Escape: this._handleEscClose,
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this._handleResize();
    window.addEventListener("resize", this._handleResize);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._handleResize);
    this._unsubscribeTinyKeys?.();
  }

  private _handleResize = () => {
    this._narrow =
      window.matchMedia("(max-width: 870px)").matches ||
      window.matchMedia("(max-height: 500px)").matches;

    if (!this._openedNarrow && this._pickerWrapperOpen) {
      this._popoverWidth = this._containerElement?.offsetWidth || 250;
    }
  };

  private _handleEscClose = (ev: KeyboardEvent) => {
    ev.stopPropagation();
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
          margin: var(--ha-space-2) 0 0;
        }
        :host([invalid]) ha-input-helper-text {
          color: var(--mdc-theme-error, var(--error-color, #b00020));
        }

        wa-popover {
          --wa-space-l: var(--ha-space-0);
        }

        wa-popover::part(body) {
          width: max(var(--body-width), 250px);
          max-width: var(
            --ha-generic-picker-max-width,
            max(var(--body-width), 250px)
          );
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
          --ha-bottom-sheet-border-radius: var(--ha-border-radius-2xl);
        }

        ha-picker-field.opened {
          --mdc-text-field-idle-line-color: var(--primary-color);
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
