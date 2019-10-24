import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
import "@vaadin/vaadin-combo-box/vaadin-combo-box-light";
import memoizeOne from "memoize-one";

import "./state-badge";

import { computeStateName } from "../../common/entity/compute_state_name";
import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  property,
  PropertyValues,
} from "lit-element";
import { HomeAssistant } from "../../types";
import { HassEntity } from "home-assistant-js-websocket";
import { PolymerChangedEvent } from "../../polymer-types";
import { fireEvent } from "../../common/dom/fire_event";

export type HaEntityPickerEntityFilterFunc = (entityId: HassEntity) => boolean;

const rowRenderer = (
  root: HTMLElement,
  _owner,
  model: { item: HassEntity }
) => {
  if (!root.firstElementChild) {
    root.innerHTML = `
      <style>
        paper-icon-item {
          margin: -10px;
          padding: 0;
        }
      </style>
      <paper-icon-item>
        <state-badge state-obj="[[item]]" slot="item-icon"></state-badge>
        <paper-item-body two-line="">
          <div class='name'>[[_computeStateName(item)]]</div>
          <div secondary>[[item.entity_id]]</div>
        </paper-item-body>
      </paper-icon-item>
    `;
  }

  root.querySelector("state-badge")!.stateObj = model.item;
  root.querySelector(".name")!.textContent = computeStateName(model.item);
  root.querySelector("[secondary]")!.textContent = model.item.entity_id;
};

class HaEntityPicker extends LitElement {
  @property({ type: Boolean }) public autofocus?: boolean;
  @property({ type: Boolean }) public disabled?: boolean;
  @property({ type: Boolean, attribute: "allow-custom-entity" })
  public allowCustomEntity;
  @property() public hass?: HomeAssistant;
  @property() public label?: string;
  @property() public value?: string;
  @property({ attribute: "domain-filter" }) public domainFilter?: string;
  @property() public entityFilter?: HaEntityPickerEntityFilterFunc;
  @property({ type: Boolean }) private _opened?: boolean;
  @property() private _hass?: HomeAssistant;

  private _getStates = memoizeOne(
    (
      hass: this["hass"],
      domainFilter: this["domainFilter"],
      entityFilter: this["entityFilter"]
    ) => {
      let states: HassEntity[] = [];

      if (!hass) {
        return [];
      }
      let entityIds = Object.keys(hass.states);

      if (domainFilter) {
        entityIds = entityIds.filter(
          (eid) => eid.substr(0, eid.indexOf(".")) === domainFilter
        );
      }

      states = entityIds.sort().map((key) => hass!.states[key]);

      if (entityFilter) {
        states = states.filter(
          (stateObj) =>
            // We always want to include the entity of the current value
            stateObj.entity_id === this.value || entityFilter!(stateObj)
        );
      }
      return states;
    }
  );

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("hass") && !this._opened) {
      this._hass = this.hass;
    }
  }

  protected render(): TemplateResult | void {
    const states = this._getStates(
      this._hass,
      this.domainFilter,
      this.entityFilter
    );

    return html`
      <vaadin-combo-box-light
        item-value-path="entity_id"
        item-label-path="entity_id"
        .items=${states}
        .value=${this._value}
        .allowCustomValue=${this.allowCustomEntity}
        .renderer=${rowRenderer}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
      >
        <paper-input
          .autofocus=${this.autofocus}
          .label=${this.label === undefined && this._hass
            ? this._hass.localize("ui.components.entity.entity-picker.entity")
            : this.label}
          .value=${this._value}
          .disabled=${this.disabled}
          class="input"
          autocapitalize="none"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        >
          ${this.value
            ? html`
                <paper-icon-button
                  aria-label=${this.hass!.localize(
                    "ui.components.entity.entity-picker.clear"
                  )}
                  slot="suffix"
                  class="clear-button"
                  icon="hass:close"
                  no-ripple
                >
                  Clear
                </paper-icon-button>
              `
            : ""}
          ${states.length > 0
            ? html`
                <paper-icon-button
                  aria-label=${this.hass!.localize(
                    "ui.components.entity.entity-picker.show_entities"
                  )}
                  slot="suffix"
                  class="toggle-button"
                  .icon=${this._opened ? "hass:menu-up" : "hass:menu-down"}
                >
                  Toggle
                </paper-icon-button>
              `
            : ""}
        </paper-input>
      </vaadin-combo-box-light>
    `;
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
      this.value = ev.detail.value;
      setTimeout(() => {
        fireEvent(this, "value-changed", { value: this.value });
        fireEvent(this, "change");
      }, 0);
    }
  }

  static get styles(): CSSResult {
    return css`
      paper-input > paper-icon-button {
        width: 24px;
        height: 24px;
        padding: 2px;
        color: var(--secondary-text-color);
      }
      [hidden] {
        display: none;
      }
    `;
  }
}

customElements.define("ha-entity-picker", HaEntityPicker);

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-picker": HaEntityPicker;
  }
}
