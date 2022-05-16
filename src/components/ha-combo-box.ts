import "@material/mwc-list/mwc-list-item";
import { mdiClose, mdiMenuDown, mdiMenuUp } from "@mdi/js";
import "@vaadin/combo-box/theme/material/vaadin-combo-box-light";
import type { ComboBoxLight } from "@vaadin/combo-box/vaadin-combo-box-light";
import { registerStyles } from "@vaadin/vaadin-themable-mixin/register-styles";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { ComboBoxLitRenderer, comboBoxRenderer } from "lit-vaadin-helpers";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { PolymerChangedEvent } from "../polymer-types";
import { HomeAssistant } from "../types";
import "./ha-icon-button";
import "./ha-textfield";

registerStyles(
  "vaadin-combo-box-item",
  css`
    :host {
      padding: 0;
    }
    :host([focused]:not([disabled])) {
      background-color: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.12);
    }
    :host([selected]:not([disabled])) {
      background-color: transparent;
      color: var(--mdc-theme-primary);
      --mdc-ripple-color: var(--mdc-theme-primary);
      --mdc-theme-text-primary-on-background: var(--mdc-theme-primary);
    }
    :host([selected]:not([disabled])):before {
      background-color: var(--mdc-theme-primary);
      opacity: 0.12;
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    :host([selected][focused]:not([disabled])):before {
      opacity: 0.24;
    }
    :host(:hover:not([disabled])) {
      background-color: transparent;
    }
    [part="content"] {
      width: 100%;
    }
    [part="checkmark"] {
      display: none;
    }
  `
);

@customElement("ha-combo-box")
export class HaComboBox extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public placeholder?: string;

  @property() public validationMessage?: string;

  @property() public helper?: string;

  @property({ attribute: "error-message" }) public errorMessage?: string;

  @property({ type: Boolean }) public invalid?: boolean;

  @property({ type: Boolean }) public icon?: boolean;

  @property() public items?: any[];

  @property() public filteredItems?: any[];

  @property({ attribute: "allow-custom-value", type: Boolean })
  public allowCustomValue?: boolean;

  @property({ attribute: "item-value-path" }) public itemValuePath?: string;

  @property({ attribute: "item-label-path" }) public itemLabelPath?: string;

  @property({ attribute: "item-id-path" }) public itemIdPath?: string;

  @property() public renderer?: ComboBoxLitRenderer<any>;

  @property({ type: Boolean }) public disabled?: boolean;

  @property({ type: Boolean }) public required?: boolean;

  @property({ type: Boolean, reflect: true, attribute: "opened" })
  private _opened?: boolean;

  @query("vaadin-combo-box-light", true) private _comboBox!: ComboBoxLight;

  public open() {
    this.updateComplete.then(() => {
      this._comboBox?.open();
    });
  }

  public focus() {
    this.updateComplete.then(() => {
      this._comboBox?.inputElement?.focus();
    });
  }

  public get selectedItem() {
    return this._comboBox.selectedItem;
  }

  public setInputValue(value: string) {
    this._comboBox.value = value;
  }

  protected render(): TemplateResult {
    return html`
      <vaadin-combo-box-light
        .itemValuePath=${this.itemValuePath}
        .itemIdPath=${this.itemIdPath}
        .itemLabelPath=${this.itemLabelPath}
        .items=${this.items}
        .value=${this.value || ""}
        .filteredItems=${this.filteredItems}
        .allowCustomValue=${this.allowCustomValue}
        .disabled=${this.disabled}
        .required=${this.required}
        ${comboBoxRenderer(this.renderer || this._defaultRowRenderer)}
        @opened-changed=${this._openedChanged}
        @filter-changed=${this._filterChanged}
        @value-changed=${this._valueChanged}
        attr-for-value="value"
      >
        <ha-textfield
          .label=${this.label}
          .placeholder=${this.placeholder}
          .disabled=${this.disabled}
          .required=${this.required}
          .validationMessage=${this.validationMessage}
          .errorMessage=${this.errorMessage}
          class="input"
          autocapitalize="none"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          .suffix=${html`<div style="width: 28px;"></div>`}
          .icon=${this.icon}
          .invalid=${this.invalid}
          .helper=${this.helper}
          helperPersistent
        >
          <slot name="icon" slot="leadingIcon"></slot>
        </ha-textfield>
        ${this.value
          ? html`<ha-svg-icon
              aria-label=${this.hass?.localize("ui.components.combo-box.clear")}
              class="clear-button"
              .path=${mdiClose}
              @click=${this._clearValue}
            ></ha-svg-icon>`
          : ""}
        <ha-svg-icon
          aria-label=${this.hass?.localize("ui.components.combo-box.show")}
          class="toggle-button"
          .path=${this._opened ? mdiMenuUp : mdiMenuDown}
          @click=${this._toggleOpen}
        ></ha-svg-icon>
      </vaadin-combo-box-light>
    `;
  }

  private _defaultRowRenderer: ComboBoxLitRenderer<
    string | Record<string, any>
  > = (item) =>
    html`<mwc-list-item>
      ${this.itemLabelPath ? item[this.itemLabelPath] : item}
    </mwc-list-item>`;

  private _clearValue(ev: Event) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: undefined });
  }

  private _toggleOpen(ev: Event) {
    if (this._opened) {
      this._comboBox?.close();
      ev.stopPropagation();
    } else {
      this._comboBox?.inputElement.focus();
    }
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    // delay this so we can handle click event before setting _opened
    setTimeout(() => {
      this._opened = ev.detail.value;
    }, 0);
    // @ts-ignore
    fireEvent(this, ev.type, ev.detail);
  }

  private _filterChanged(ev: PolymerChangedEvent<string>) {
    // @ts-ignore
    fireEvent(this, ev.type, ev.detail, { composed: false });
  }

  private _valueChanged(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    const newValue = ev.detail.value;

    if (newValue !== this.value) {
      fireEvent(this, "value-changed", { value: newValue });
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        width: 100%;
      }
      vaadin-combo-box-light {
        position: relative;
      }
      ha-textfield {
        width: 100%;
      }
      ha-textfield > ha-icon-button {
        --mdc-icon-button-size: 24px;
        padding: 2px;
        color: var(--secondary-text-color);
      }
      ha-svg-icon {
        color: var(--input-dropdown-icon-color);
        position: absolute;
        cursor: pointer;
      }
      .toggle-button {
        right: 12px;
        top: -10px;
        inset-inline-start: initial;
        inset-inline-end: 12px;
        direction: var(--direction);
      }
      :host([opened]) .toggle-button {
        color: var(--primary-color);
      }
      .clear-button {
        --mdc-icon-size: 20px;
        top: -7px;
        right: 36px;
        inset-inline-start: initial;
        inset-inline-end: 36px;
        direction: var(--direction);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-combo-box": HaComboBox;
  }
}
