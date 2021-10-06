import "@polymer/paper-input/paper-input";
import { mdiCheck } from "@mdi/js";
import { css, html, LitElement, TemplateResult } from "lit";
import { ComboBoxLitRenderer, comboBoxRenderer } from "lit-vaadin-helpers";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { PolymerChangedEvent } from "../polymer-types";
import "./ha-icon";
import { mdiDeprecatedIcons } from "../data/iconsets";

let cachedState: string[];

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
    <paper-item-body> ${item} </paper-item-body>
  </paper-icon-item>`;

@customElement("ha-icon-picker")
export class HaIconPicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property() public placeholder?: string;

  @property({ attribute: "error-message" }) public errorMessage?: string;

  @property({ type: Boolean }) public disabled = false;

  @query("vaadin-combo-box-light", true) private comboBox!: HTMLElement;

  private _initedStates = false;

  private _states: string[] = [];

  @property({ type: Boolean }) private _opened = false;

  protected render(): TemplateResult {
    return html`
      <vaadin-combo-box-light
        item-value-path="icon"
        item-label-path="icon"
        .value=${this._value}
        .allowCustomValue=${true}
        .filteredItems=${[]}
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
          ${!this._opened && (this._value || this.placeholder)
            ? html`
                <ha-icon .icon=${this._value || this.placeholder} slot="suffix">
                </ha-icon>
              `
            : ""}
        </paper-input>
      </vaadin-combo-box-light>
    `;
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
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
      const filteredItems = this._states.filter((state) =>
        state.toLowerCase().includes(filterString)
      );
      if (filteredItems.length > 0) {
        (this.comboBox as any).filteredItems = filteredItems;
      } else {
        (this.comboBox as any).filteredItems = [filterString];
      }
    } else {
      (this.comboBox as any).filteredItems = [];
    }
  }

  public willUpdate() {
    if (!this._initedStates) {
      if (cachedState) {
        this._states = cachedState;
        this._initedStates = true;
      } else {
        fetch(`/static/mdi/iconList.json`)
          .then((response) => response.json())
          .then((icons) => {
            this._states = icons
              .filter((icon) => !(icon in mdiDeprecatedIcons))
              .map((icon) => `mdi:${icon}`);
            cachedState = this._states;
            this._initedStates = true;
          });
      }
    }
  }

  private get _value() {
    return this.value || "";
  }

  static get styles() {
    return css`
      ha-icon {
        position: absolute;
        bottom: 2px;
        right: 0;
      }
    `;
  }
}
