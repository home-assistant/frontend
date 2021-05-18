import "@material/mwc-icon-button/mwc-icon-button";
import { mdiClose, mdiMenuDown, mdiMenuUp } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";
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
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { PolymerChangedEvent } from "../../polymer-types";
import { HomeAssistant } from "../../types";
import "../ha-svg-icon";
import "./state-badge";

export type HaEntityPickerEntityFilterFunc = (entityId: HassEntity) => boolean;

const rowRenderer: ComboBoxLitRenderer<HassEntity> = (item) => html`<style>
    paper-icon-item {
      margin: -10px;
      padding: 0;
    }
  </style>
  <paper-icon-item>
    <state-badge slot="item-icon" .stateObj=${item}></state-badge>
    <paper-item-body two-line="">
      ${computeStateName(item)}
      <span secondary>${item.entity_id}</span>
    </paper-item-body>
  </paper-icon-item>`;

@customElement("ha-entity-picker")
export class HaEntityPicker extends LitElement {
  @property({ type: Boolean }) public autofocus = false;

  @property({ type: Boolean }) public disabled?: boolean;

  @property({ type: Boolean, attribute: "allow-custom-entity" })
  public allowCustomEntity;

  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  /**
   * Show entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  /**
   * Show only entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  @property() public entityFilter?: HaEntityPickerEntityFilterFunc;

  @property({ type: Boolean }) public hideClearIcon = false;

  @property({ type: Boolean }) private _opened = false;

  @query("vaadin-combo-box-light", true) private comboBox!: HTMLElement;

  public open() {
    this.updateComplete.then(() => {
      (this.shadowRoot?.querySelector("vaadin-combo-box-light") as any)?.open();
    });
  }

  public focus() {
    this.updateComplete.then(() => {
      this.shadowRoot?.querySelector("paper-input")?.focus();
    });
  }

  private _initedStates = false;

  private _states: HassEntity[] = [];

  private _getStates = memoizeOne(
    (
      _opened: boolean,
      hass: this["hass"],
      includeDomains: this["includeDomains"],
      excludeDomains: this["excludeDomains"],
      entityFilter: this["entityFilter"],
      includeDeviceClasses: this["includeDeviceClasses"]
    ) => {
      let states: HassEntity[] = [];

      if (!hass) {
        return [];
      }
      let entityIds = Object.keys(hass.states);

      if (includeDomains) {
        entityIds = entityIds.filter((eid) =>
          includeDomains.includes(computeDomain(eid))
        );
      }

      if (excludeDomains) {
        entityIds = entityIds.filter(
          (eid) => !excludeDomains.includes(computeDomain(eid))
        );
      }

      states = entityIds.sort().map((key) => hass!.states[key]);

      if (includeDeviceClasses) {
        states = states.filter(
          (stateObj) =>
            // We always want to include the entity of the current value
            stateObj.entity_id === this.value ||
            (stateObj.attributes.device_class &&
              includeDeviceClasses.includes(stateObj.attributes.device_class))
        );
      }

      if (entityFilter) {
        states = states.filter(
          (stateObj) =>
            // We always want to include the entity of the current value
            stateObj.entity_id === this.value || entityFilter!(stateObj)
        );
      }

      if (!states.length) {
        return [
          {
            entity_id: "",
            state: "",
            last_changed: "",
            last_updated: "",
            context: { id: "", user_id: null },
            attributes: {
              friendly_name: this.hass!.localize(
                "ui.components.entity.entity-picker.no_match"
              ),
              icon: "mdi:magnify",
            },
          },
        ];
      }

      return states;
    }
  );

  protected shouldUpdate(changedProps: PropertyValues) {
    if (
      changedProps.has("value") ||
      changedProps.has("label") ||
      changedProps.has("disabled")
    ) {
      return true;
    }
    return !(!changedProps.has("_opened") && this._opened);
  }

  protected updated(changedProps: PropertyValues) {
    if (!this._initedStates || (changedProps.has("_opened") && this._opened)) {
      this._states = this._getStates(
        this._opened,
        this.hass,
        this.includeDomains,
        this.excludeDomains,
        this.entityFilter,
        this.includeDeviceClasses
      );
      (this.comboBox as any).filteredItems = this._states;
      this._initedStates = true;
    }
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    return html`
      <vaadin-combo-box-light
        item-value-path="entity_id"
        item-label-path="entity_id"
        .value=${this._value}
        .allowCustomValue=${this.allowCustomEntity}
        ${comboBoxRenderer(rowRenderer)}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._valueChanged}
        @filter-changed=${this._filterChanged}
      >
        <paper-input
          .autofocus=${this.autofocus}
          .label=${this.label === undefined
            ? this.hass.localize("ui.components.entity.entity-picker.entity")
            : this.label}
          .disabled=${this.disabled}
          class="input"
          autocapitalize="none"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        >
          <div class="suffix" slot="suffix">
            ${this.value && !this.hideClearIcon
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
                "ui.components.entity.entity-picker.show_entities"
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

  private _filterChanged(ev: CustomEvent): void {
    const filterString = ev.detail.value.toLowerCase();
    (this.comboBox as any).filteredItems = this._states.filter(
      (state) =>
        state.entity_id.toLowerCase().includes(filterString) ||
        computeStateName(state).toLowerCase().includes(filterString)
    );
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
    "ha-entity-picker": HaEntityPicker;
  }
}
