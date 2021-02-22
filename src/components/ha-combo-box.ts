import "@material/mwc-icon-button/mwc-icon-button";
import { mdiClose, mdiMenuDown, mdiMenuUp } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-listbox/paper-listbox";
import "@vaadin/vaadin-combo-box/theme/material/vaadin-combo-box-light";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../common/dom/fire_event";
import { PolymerChangedEvent } from "../polymer-types";
import { HomeAssistant } from "../types";
import "./ha-svg-icon";

const defaultRowRenderer = (
  root: HTMLElement,
  _owner,
  model: { item: any }
) => {
  if (!root.firstElementChild) {
    root.innerHTML = `
    <style>
      paper-item {
        margin: -5px -10px;
        padding: 0;
      }
    </style>
    <paper-item></paper-item>
    `;
  }

  root.querySelector("paper-item")!.textContent = model.item;
};

@customElement("ha-combo-box")
export class HaComboBox extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public items?: [];

  @property() public filteredItems?: [];

  @property({ attribute: "allow-custom-value", type: Boolean })
  public allowCustomValue?: boolean;

  @property({ attribute: "item-value-path" }) public itemValuePath?: string;

  @property({ attribute: "item-label-path" }) public itemLabelPath?: string;

  @property({ attribute: "item-id-path" }) public itemIdPath?: string;

  @property() public renderer?: (
    root: HTMLElement,
    owner: HTMLElement,
    model: { item: any }
  ) => void;

  @property({ type: Boolean }) public disabled?: boolean;

  @internalProperty() private _opened?: boolean;

  @query("vaadin-combo-box-light", true) private _comboBox!: HTMLElement;

  public open() {
    this.updateComplete.then(() => {
      (this._comboBox as any)?.open();
    });
  }

  public focus() {
    this.updateComplete.then(() => {
      this.shadowRoot?.querySelector("paper-input")?.focus();
    });
  }

  protected render(): TemplateResult {
    return html`
      <vaadin-combo-box-light
        .itemValuePath=${this.itemValuePath}
        .itemIdPath=${this.itemIdPath}
        .itemLabelPath=${this.itemLabelPath}
        .value=${this.value}
        .items=${this.items}
        .filteredItems=${this.filteredItems}
        .renderer=${this.renderer || defaultRowRenderer}
        .allowCustomValue=${this.allowCustomValue}
        .disabled=${this.disabled}
        @opened-changed=${this._openedChanged}
        @filter-changed=${this._filterChanged}
        @value-changed=${this._valueChanged}
      >
        <paper-input
          .label=${this.label}
          .disabled=${this.disabled}
          class="input"
          autocapitalize="none"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        >
          ${this.value
            ? html`
                <mwc-icon-button
                  .label=${this.hass.localize("ui.components.combo-box.clear")}
                  slot="suffix"
                  class="clear-button"
                  @click=${this._clearValue}
                >
                  <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
                </mwc-icon-button>
              `
            : ""}

          <mwc-icon-button
            .label=${this.hass.localize("ui.components.combo-box.show")}
            slot="suffix"
            class="toggle-button"
          >
            <ha-svg-icon
              .path=${this._opened ? mdiMenuUp : mdiMenuDown}
            ></ha-svg-icon>
          </mwc-icon-button>
        </paper-input>
      </vaadin-combo-box-light>
    `;
  }

  private _clearValue(ev: Event) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: undefined });
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
    // @ts-ignore
    fireEvent(this, ev.type, ev.detail);
  }

  private _filterChanged(ev: PolymerChangedEvent<boolean>) {
    // @ts-ignore
    fireEvent(this, ev.type, ev.detail);
  }

  private _valueChanged(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    const newValue = ev.detail.value;

    if (newValue !== this.value) {
      fireEvent(this, "value-changed", { value: newValue });
    }
  }

  static get styles(): CSSResult {
    return css`
      paper-input > mwc-icon-button {
        --mdc-icon-button-size: 24px;
        padding: 2px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-combo-box": HaComboBox;
  }
}
