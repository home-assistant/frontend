import "@home-assistant/webawesome/dist/components/popover/popover";
import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { consume, type ContextType } from "@lit/context";
import { mdiPlaylistPlus } from "@mdi/js";
import {
  css,
  html,
  LitElement,
  nothing,
  type CSSResultGroup,
  type PropertyValues,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { tinykeys } from "tinykeys";
import { fireEvent } from "../common/dom/fire_event";
import { authContext, localizeContext } from "../data/context";
import { PickerMixin } from "../mixins/picker-mixin";
import type { FuseWeightedKey } from "../resources/fuseMultiTerm";
import { isIosApp } from "../util/is_ios";
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
import "./ha-svg-icon";
import "./input/ha-input-label";
import { inputWrapperStyles } from "./input/styles";

@customElement("ha-generic-picker")
export class HaGenericPicker extends PickerMixin(LitElement) {
  @property({ type: Boolean, attribute: "allow-custom-value" })
  public allowCustomValue;

  @property({ type: String, attribute: "search-label" })
  public searchLabel?: string;

  /** To prevent lags, getItems needs to be memoized */
  @property({ attribute: false })
  public getItems!: (
    searchString?: string,
    section?: string
  ) => (PickerComboBoxItem | string)[] | undefined;

  @property({ attribute: false })
  public getAdditionalItems?: (searchString?: string) => PickerComboBoxItem[];

  @property({ attribute: false })
  public rowRenderer?: RenderItemFunction<PickerComboBoxItem>;

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

  @property({ attribute: false }) public popoverAnchor?: Element | null;

  @property({ type: Boolean, attribute: "use-top-label" })
  public useTopLabel = false;

  @property({ attribute: "custom-value-label" })
  public customValueLabel?: string;

  @query(".container") private _containerElement?: HTMLDivElement;

  @query("ha-picker-combo-box") private _comboBox?: HaPickerComboBox;

  @state()
  @consume({ context: localizeContext, subscribe: true })
  private localize?: ContextType<typeof localizeContext>;

  @state()
  @consume({ context: authContext, subscribe: true })
  private auth?: ContextType<typeof authContext>;

  @state() private _opened = false;

  @state() private _pickerWrapperOpen = false;

  @state() private _popoverWidth = 0;

  @state() private _openedNarrow = false;

  @state() private _unknownValue = false;

  @state() private _selectedValue?: string;

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

  protected willUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has("value")) {
      this._setUnknownValue();
    }
  }

  public setFieldValue(value: string) {
    if (this._comboBox) {
      this._comboBox.setFieldValue(value);
      return;
    }
    // Store initial value to set when opened
    this._initialFieldValue = value;
  }

  private _renderAddButton() {
    const button = html`
      <ha-button
        id="add-button"
        size="small"
        appearance="filled"
        @click=${this.open}
        .disabled=${this.disabled}
      >
        <ha-svg-icon .path=${mdiPlaylistPlus} slot="start"></ha-svg-icon>
        ${this.addButtonLabel ||
        this.placeholder ||
        this.localize?.("ui.common.add") ||
        "Add"}
      </ha-button>
    `;

    if (this.addButtonLabel) {
      return button;
    }

    return html`
      ${this.label
        ? html`<ha-input-label .label=${this.label}></ha-input-label>`
        : nothing}
      <div class="input-wrapper">${button}</div>
    `;
  }

  protected render() {
    return html`<div class="container">
        <div id="picker">
          <slot name="field">
            ${(this.addButtonLabel || !this.icon) && !this.value
              ? this._renderAddButton()
              : html`<ha-picker-field
                  type="button"
                  .open=${this._opened}
                  compact
                  .unknown=${this._unknownValue}
                  .unknownItemText=${this.unknownItemText}
                  aria-label=${ifDefined(this.label)}
                  @click=${this.open}
                  @clear=${this._clear}
                  .icon=${this.icon}
                  .image=${this.image}
                  .label=${this.label}
                  .placeholder=${this.placeholder}
                  .value=${this.value}
                  .valueRenderer=${this.valueRenderer}
                  .required=${this.required}
                  .disabled=${this.disabled}
                  .invalid=${this.invalid}
                  .hideClearIcon=${this.hideClearIcon}
                >
                  <slot name="start"></slot>
                </ha-picker-field>`}
          </slot>
        </div>
        ${this._pickerWrapperOpen || this._opened
          ? this._openedNarrow
            ? html`
                <ha-bottom-sheet
                  flexcontent
                  .open=${this._pickerWrapperOpen}
                  @wa-after-show=${this._dialogOpened}
                  @closed=${this._hidePicker}
                  role="dialog"
                  aria-modal="true"
                  aria-label=${this.label || "Select option"}
                >
                  ${this._renderComboBox(true)}
                </ha-bottom-sheet>
              `
            : html`
                <wa-popover
                  .open=${this._pickerWrapperOpen}
                  style="--body-width: ${this._popoverWidth}px;"
                  without-arrow
                  distance="-4"
                  .placement=${this.popoverPlacement}
                  .for=${this.popoverAnchor ? null : "picker"}
                  .anchor=${this.popoverAnchor ?? null}
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
          : nothing}
      </div>
      ${this._renderHelper()}`;
  }

  private _renderComboBox(dialogMode = false) {
    if (!this._opened) {
      return nothing;
    }
    return html`
      <ha-picker-combo-box
        id="combo-box"
        .allowCustomValue=${this.allowCustomValue}
        .label=${this.searchLabel}
        .value=${this._selectedValue ?? this.value}
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
        .customValueLabel=${this.customValueLabel}
      ></ha-picker-combo-box>
    `;
  }

  private _setUnknownValue = () => {
    const items = this.getItems();
    if (
      this.allowCustomValue ||
      this.value === undefined ||
      this.value === null ||
      this.value === "" ||
      !items
    ) {
      this._unknownValue = false;
      return;
    }

    this._unknownValue = !items.some(
      (item) => typeof item !== "string" && item.id === this.value
    );
  };

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

  private _initialFieldValue?: string;

  private _dialogOpened = () => {
    this._opened = true;
    requestAnimationFrame(() => {
      // Set initial field value if needed
      if (this._initialFieldValue) {
        this._comboBox?.setFieldValue(this._initialFieldValue);
        this._initialFieldValue = undefined;
      }
      if (this.auth?.external && isIosApp(this.auth.external)) {
        this.auth.external.fireMessage({
          type: "focus_element",
          payload: {
            element_id: "combo-box",
          },
        });
        return;
      }

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
    this._selectedValue = undefined;
    this._unsubscribeTinyKeys?.();
    fireEvent(this, "picker-closed");
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

  private _clear(e: CustomEvent) {
    e.stopPropagation();
    this._setValue(undefined);
  }

  private _setValue(value: string | undefined) {
    this.value = value;
    fireEvent(this, "value-changed", { value });
  }

  public async open(
    ev?: Event,
    options?: {
      selectedValue?: string;
    }
  ) {
    ev?.stopPropagation();
    if (this.disabled) {
      return;
    }
    this._selectedValue = options?.selectedValue;
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
      inputWrapperStyles,
      css`
        .container {
          position: relative;
          display: block;
          max-width: 100%;
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
          --wa-space-l: 0;
        }

        wa-popover::part(dialog)::backdrop {
          background: none;
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
          --ha-bottom-sheet-padding: 0;
          --ha-bottom-sheet-surface-background: var(--card-background-color);
          --ha-bottom-sheet-border-radius: var(--ha-border-radius-2xl);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-generic-picker": HaGenericPicker;
  }

  interface HASSDomEvents {
    "picker-closed": undefined;
  }
}
