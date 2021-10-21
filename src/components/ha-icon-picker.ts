import { mdiCheck, mdiMenuDown, mdiMenuUp } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import "@vaadin/vaadin-combo-box/theme/material/vaadin-combo-box-light";
import { css, html, LitElement, TemplateResult } from "lit";
import { ComboBoxLitRenderer, comboBoxRenderer } from "lit-vaadin-helpers";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { PolymerChangedEvent } from "../polymer-types";
import "./ha-icon";
import "./ha-icon-button";

let mdiIconList: string[] = [];

// eslint-disable-next-line lit/prefer-static-styles
const rowRenderer: ComboBoxLitRenderer<string> = (item) => html`<style>
    paper-icon-item {
      padding: 0;
      margin: -8px;
    }
    #content {
      display: flex;
      align-items: center;
    }
    ha-svg-icon {
      padding-left: 2px;
      color: var(--secondary-text-color);
    }
    :host(:not([selected])) ha-svg-icon {
      display: none;
    }
    :host([selected]) paper-icon-item {
      margin-left: 0;
    }
  </style>

  <ha-svg-icon .path=${mdiCheck}></ha-svg-icon>
  <paper-icon-item>
    <ha-icon .icon=${item} slot="item-icon"></ha-icon>
    <paper-item-body>${item}</paper-item-body>
  </paper-icon-item>`;

@customElement("ha-icon-picker")
export class HaIconPicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property() public placeholder?: string;

  @property() public fallbackPath?: string;

  @property({ attribute: "error-message" }) public errorMessage?: string;

  @property({ type: Boolean }) public disabled = false;

  @state() private _opened = false;

  @query("vaadin-combo-box-light", true) private comboBox!: HTMLElement;

  protected render(): TemplateResult {
    return html`
      <vaadin-combo-box-light
        item-value-path="icon"
        item-label-path="icon"
        .value=${this._value}
        allow-custom-value
        .filteredItems=${mdiIconList}
        ${comboBoxRenderer(rowRenderer)}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
        @filter-changed=${this._filterChanged}
      >
        <paper-input
          .label=${this.label}
          .placeholder=${this.placeholder}
          .disabled=${this.disabled}
          class="input"
          autocapitalize="none"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        >
          ${this._value || this.placeholder
            ? html`
                <ha-icon .icon=${this._value || this.placeholder} slot="prefix">
                </ha-icon>
              `
            : this.fallbackPath
            ? html`<ha-svg-icon
                .path=${this.fallbackPath}
                slot="prefix"
              ></ha-svg-icon>`
            : ""}
          <ha-icon-button
            .path=${this._opened ? mdiMenuUp : mdiMenuDown}
            slot="suffix"
            class="toggle-button"
          ></ha-icon-button>
        </paper-input>
      </vaadin-combo-box-light>
    `;
  }

  private async _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
    if (this._opened && !mdiIconList.length) {
      const iconList = await import("../../build/mdi/iconList.json");
      mdiIconList = iconList.default.map((icon) => `mdi:${icon}`);
      (this.comboBox as any).filteredItems = mdiIconList;
    }
  }

  private _valueChanged(ev: PolymerChangedEvent<string>) {
    this._setValue(ev.detail.value);
  }

  private _setValue(value: string) {
    this.value = value;
    fireEvent(
      this,
      "value-changed",
      { value },
      {
        bubbles: false,
        composed: false,
      }
    );
  }

  private _filterChanged(ev: CustomEvent): void {
    const filterString = ev.detail.value.toLowerCase();
    const characterCount = filterString.length;
    if (characterCount >= 2) {
      const filteredItems = mdiIconList.filter((icon) =>
        icon.includes(filterString)
      );
      if (filteredItems.length > 0) {
        (this.comboBox as any).filteredItems = filteredItems;
      } else {
        (this.comboBox as any).filteredItems = [filterString];
      }
    } else {
      (this.comboBox as any).filteredItems = mdiIconList;
    }
  }

  private get _value() {
    return this.value || "";
  }

  static get styles() {
    return css`
      ha-icon,
      ha-svg-icon {
        position: relative;
        bottom: 2px;
      }
      *[slot="prefix"] {
        margin-right: 8px;
      }
      paper-input > ha-icon-button {
        --mdc-icon-button-size: 24px;
        padding: 2px;
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-icon-picker": HaIconPicker;
  }
}
