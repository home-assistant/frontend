import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { computeStateDisplay } from "../../common/entity/compute_state_display";
import { PolymerChangedEvent } from "../../polymer-types";
import { getStates } from "../../common/entity/get_states";
import { HomeAssistant } from "../../types";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";

export type HaEntityPickerEntityFilterFunc = (entityId: HassEntity) => boolean;

@customElement("ha-entity-state-picker")
class HaEntityStatePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityId?: string;

  @property() public attribute?: string;

  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, attribute: "allow-custom-value" })
  public allowCustomValue;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) private _opened = false;

  @query("ha-combo-box", true) private _comboBox!: HaComboBox;

  protected shouldUpdate(changedProps: PropertyValues) {
    return !(!changedProps.has("_opened") && this._opened);
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("_opened") && this._opened) {
      const state = this.entityId ? this.hass.states[this.entityId] : undefined;
      (this._comboBox as any).items =
        this.entityId && state
          ? getStates(state, this.attribute).map((key) => ({
              value: key,
              label: !this.attribute
                ? computeStateDisplay(
                    this.hass.localize,
                    state,
                    this.hass.locale,
                    key,
                    // If we have an attribute set, the unit is not relevant since it only applies to the entity state
                    !!this.attribute
                  )
                : key,
            }))
          : [];
    }
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      <ha-combo-box
        .hass=${this.hass}
        .value=${this.value
          ? this.entityId && this.hass.states[this.entityId]
            ? computeStateDisplay(
                this.hass.localize,
                this.hass.states[this.entityId],
                this.hass.locale,
                this.value,
                // If we have an attribute set, the unit is not relevant since it only applies to the entity state
                !!this.attribute
              )
            : this.value
          : ""}
        .autofocus=${this.autofocus}
        .label=${this.label ??
        this.hass.localize("ui.components.entity.entity-state-picker.state")}
        .disabled=${this.disabled || !this.entityId}
        .required=${this.required}
        .helper=${this.helper}
        .allowCustomValue=${this.allowCustomValue}
        item-value-path="value"
        item-label-path="label"
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
      >
      </ha-combo-box>
    `;
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _valueChanged(ev: PolymerChangedEvent<string>) {
    this.value = ev.detail.value;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-state-picker": HaEntityStatePicker;
  }
}
