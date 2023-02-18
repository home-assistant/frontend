import { HassEntity } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { computeStateDisplay } from "../../common/entity/compute_state_display";
import { PolymerChangedEvent } from "../../polymer-types";
import { getStates } from "../../common/entity/get_states";
import { HomeAssistant } from "../../types";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";
import { formatAttributeValue } from "../../data/entity_attributes";
import { fireEvent } from "../../common/dom/fire_event";
import { fetchDateWS } from "../../data/history";
import { computeDomain } from "../../common/entity/compute_domain";

export type HaEntityPickerEntityFilterFunc = (entityId: HassEntity) => boolean;

const DYNAMIC_STATE_DOMAINS = [
  "sensor",
  "input_text",
  "text",
  "input_number",
  "number",
  "person",
  "device_tracker",
  "zone",
];

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

  @state() private _stateHistory;

  @state() private _fetching = false;

  @state() private _discardFetch = false;

  @query("ha-combo-box", true) private _comboBox!: HaComboBox;

  protected shouldUpdate(changedProps: PropertyValues) {
    return !(!changedProps.has("_opened") && this._opened);
  }

  private async _getStateHistory(): Promise<void> {
    if (this._fetching) {
      return;
    }
    this._fetching = true;
    this._discardFetch = false;
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 60 * 24 * 1000 * 3); // 3 days
      const history = {
        ...(await fetchDateWS(this.hass, startTime, endTime, [this.entityId!])),
      };
      if (!this._discardFetch) {
        this._stateHistory = history[this.entityId!].map((key) => key.s);
        this._stateHistory = [...new Set(this._stateHistory.reverse())].slice(
          0,
          9
        );
      }
    } finally {
      this._fetching = false;
      this._discardFetch = false;
    }
  }

  protected updated(changedProps: PropertyValues) {
    if (
      this.entityId &&
      (changedProps.has("entityId") ||
        (changedProps.has("_discardFetch") &&
          changedProps.get("_discardFetch") &&
          !this._discardFetch))
    ) {
      this._discardFetch = this._fetching; // if entity changes while fetching, discard the result, and then refetch when done
      this._stateHistory = [];
      if (DYNAMIC_STATE_DOMAINS.includes(computeDomain(this.entityId))) {
        this._getStateHistory();
      }
    }

    if (changedProps.has("_opened") && this._opened) {
      const hassState = this.entityId
        ? this.hass.states[this.entityId]
        : undefined;
      const items =
        this.entityId && hassState
          ? getStates(hassState, this.attribute).map((key) => ({
              value: key,
              label: !this.attribute
                ? computeStateDisplay(
                    this.hass.localize,
                    hassState,
                    this.hass.locale,
                    this.hass.entities,
                    key
                  )
                : formatAttributeValue(this.hass, key),
            }))
          : [];
      if (!this.attribute) {
        const itemsValues = items.map((key) => key.value);
        const historyItems = this._stateHistory.filter(
          (key) => !itemsValues.includes(key) && key
        );
        items.push(
          ...historyItems.map((v) => ({
            value: v,
            label: v,
          }))
        );
      }
      (this._comboBox as any).items = items;
    }
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }

    return html`
      <ha-combo-box
        .hass=${this.hass}
        .value=${this._value}
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

  private get _value() {
    return this.value || "";
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _valueChanged(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-state-picker": HaEntityStatePicker;
  }
}
