import "@material/mwc-icon-button/mwc-icon-button";
import { mdiClose, mdiMenuDown, mdiMenuUp } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@vaadin/vaadin-combo-box/theme/material/vaadin-combo-box-light";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { ComboBoxLitRenderer, comboBoxRenderer } from "lit-vaadin-helpers";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { PolymerChangedEvent } from "../../polymer-types";
import { HomeAssistant } from "../../types";
import { formatAttributeName } from "../../util/hass-attributes-util";
import "../ha-svg-icon";
import "./state-badge";

export type HaEntityPickerEntityFilterFunc = (entityId: HassEntity) => boolean;

const rowRenderer: ComboBoxLitRenderer<string> = (item) => html`<style>
    paper-item {
      margin: -5px -10px;
      padding: 0;
    }
  </style>
  <paper-item>${formatAttributeName(item)}</paper-item>`;

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
        attr-for-value="bind-value"
        ${comboBoxRenderer(rowRenderer)}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
      >
        <paper-input
          .autofocus=${this.autofocus}
          .label=${this.label ??
          this.hass.localize(
            "ui.components.entity.entity-attribute-picker.attribute"
          )}
          .value=${this._value ? formatAttributeName(this._value) : ""}
          .disabled=${this.disabled || !this.entityId}
          class="input"
          autocapitalize="none"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        >
          <div class="suffix" slot="suffix">
            ${this.value
              ? html`
                  <mwc-icon-button
                    .label=${this.hass.localize(
                      "ui.components.entity.entity-picker.clear"
                    )}
                    class="clear-button"
                    tabindex="-1"
                    @click=${this._clearValue}
                    no-ripple
                  >
                    <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
                  </mwc-icon-button>
                `
              : ""}

            <mwc-icon-button
              .label=${this.hass.localize(
                "ui.components.entity.entity-attribute-picker.show_attributes"
              )}
              class="toggle-button"
              tabindex="-1"
            >
              <ha-svg-icon
                .path=${this._opened ? mdiMenuUp : mdiMenuDown}
              ></ha-svg-icon>
            </mwc-icon-button>
          </div>
        </paper-input>
      </vaadin-combo-box-light>
    `;
  }

  private _clearValue(ev: Event) {
    ev.stopPropagation();
    this._setValue("");
  }

  private get _value() {
    return this.value;
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

  static get styles(): CSSResultGroup {
    return css`
      .suffix {
        display: flex;
      }
      mwc-icon-button {
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
