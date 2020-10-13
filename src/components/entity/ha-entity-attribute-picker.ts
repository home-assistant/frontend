import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@vaadin/vaadin-combo-box/theme/material/vaadin-combo-box-light";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import { PolymerChangedEvent } from "../../polymer-types";
import { HomeAssistant } from "../../types";
import "../ha-icon-button";
import "./state-badge";

export type HaEntityPickerEntityFilterFunc = (entityId: HassEntity) => boolean;

const rowRenderer = (root: HTMLElement, _owner, model: { item: string }) => {
  if (!root.firstElementChild) {
    root.innerHTML = `
      <style>
        paper-item {
          margin: -10px;
          padding: 0;
        }
      </style>
      <paper-item></paper-item>
    `;
  }
  root.querySelector("paper-item")!.textContent = model.item;
};

@customElement("ha-entity-attribute-picker")
class HaEntityAttributePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId?: string;

  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, attribute: "allow-custom-value" })
  public allowCustomValue;

  @property() public label?: string;

  @property() public value?: string;

  @property({ type: Boolean }) private _opened = false;

  @query("vaadin-combo-box-light", true) private _comboBox!: HTMLElement;

  protected shouldUpdate(changedProps: PropertyValues) {
    return !(!changedProps.has("_opened") && this._opened);
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("_opened") && this._opened) {
      const state = this.entityId ? this.hass.states[this.entityId] : undefined;
      (this._comboBox as any).items = state
        ? Object.keys(state.attributes)
        : [];
    }
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      <vaadin-combo-box-light
        .value=${this._value}
        .allowCustomValue=${this.allowCustomValue}
        .renderer=${rowRenderer}
        attr-for-value="bind-value"
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
      >
        <paper-input
          .autofocus=${this.autofocus}
          .label=${this.label ??
          this.hass.localize(
            "ui.components.entity.entity-attribute-picker.attribute"
          )}
          .value=${this._value}
          .disabled=${this.disabled || !this.entityId}
          class="input"
          autocapitalize="none"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        >
          ${this.value
            ? html`
                <ha-icon-button
                  aria-label=${this.hass.localize(
                    "ui.components.entity.entity-picker.clear"
                  )}
                  slot="suffix"
                  class="clear-button"
                  icon="hass:close"
                  @click=${this._clearValue}
                  no-ripple
                >
                  Clear
                </ha-icon-button>
              `
            : ""}

          <ha-icon-button
            aria-label=${this.hass.localize(
              "ui.components.entity.entity-attribute-picker.show_attributes"
            )}
            slot="suffix"
            class="toggle-button"
            .icon=${this._opened ? "hass:menu-up" : "hass:menu-down"}
          >
            Toggle
          </ha-icon-button>
        </paper-input>
      </vaadin-combo-box-light>
    `;
  }

  private _clearValue(ev: Event) {
    ev.stopPropagation();
    this._setValue("");
  }

  private get _value() {
    return this.value || "";
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _valueChanged(ev: PolymerChangedEvent<string>) {
    const newValue = ev.detail.value;
    if (newValue !== this._value) {
      this._setValue(newValue);
    }
  }

  private _setValue(value: string) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }

  static get styles(): CSSResult {
    return css`
      paper-input > ha-icon-button {
        --mdc-icon-button-size: 24px;
        padding: 0px 2px;
        color: var(--secondary-text-color);
      }
      [hidden] {
        display: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-attribute-picker": HaEntityAttributePicker;
  }
}
