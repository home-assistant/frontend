import {
  html,
  LitElement,
  TemplateResult,
  property,
  css,
  CSSResult,
  customElement,
  PropertyValues,
} from "lit-element";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import "../../../components/ha-paper-dropdown-menu";
import "../../../components/entity/state-badge";
import "../components/hui-warning";

import { computeStateName } from "../../../common/entity/compute_state_name";

import { HomeAssistant, InputSelectEntity } from "../../../types";
import { EntityRow, EntityConfig } from "./types";
import { setInputSelectOption } from "../../../data/input-select";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { forwardHaptic } from "../../../data/haptics";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { longPress } from "../common/directives/long-press-directive";
import { hasDoubleClick } from "../common/has-double-click";
import { handleClick } from "../common/handle-click";
import { classMap } from "lit-html/directives/class-map";
import { DOMAINS_HIDE_MORE_INFO } from "../../../common/const";
import { computeDomain } from "../../../common/entity/compute_domain";

@customElement("hui-input-select-entity-row")
class HuiInputSelectEntityRow extends LitElement implements EntityRow {
  @property() public hass?: HomeAssistant;

  @property() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config || !config.entity) {
      throw new Error("Invalid Configuration: 'entity' required");
    }

    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity] as
      | InputSelectEntity
      | undefined;

    if (!stateObj) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }

    const pointer =
      (this._config.tap_action && this._config.tap_action.action !== "none") ||
      (this._config.entity &&
        !DOMAINS_HIDE_MORE_INFO.includes(computeDomain(this._config.entity)));

    return html`
      <state-badge
        .stateObj=${stateObj}
        class=${classMap({
          pointer,
        })}
        @ha-click=${this._handleClick}
        @ha-hold=${this._handleHold}
        @ha-dblclick=${this._handleDblClick}
        .longPress=${longPress({
          hasDoubleClick: hasDoubleClick(this._config.double_tap_action),
        })}
      ></state-badge>
      <ha-paper-dropdown-menu
        .label=${this._config.name || computeStateName(stateObj)}
        .value=${stateObj.state}
        @iron-select=${this._selectedChanged}
        @click=${stopPropagation}
      >
        <paper-listbox slot="dropdown-content">
          ${stateObj.attributes.options.map(
            (option) => html`
              <paper-item>${option}</paper-item>
            `
          )}
        </paper-listbox>
      </ha-paper-dropdown-menu>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (!this.hass || !this._config) {
      return;
    }

    const stateObj = this.hass.states[this._config.entity] as
      | InputSelectEntity
      | undefined;

    if (!stateObj) {
      return;
    }

    // Update selected after rendering the items or else it won't work in Firefox
    this.shadowRoot!.querySelector(
      "paper-listbox"
    )!.selected = stateObj.attributes.options.indexOf(stateObj.state);
  }

  private _handleClick(): void {
    handleClick(this, this.hass!, this._config!, false, false);
  }

  private _handleHold(): void {
    handleClick(this, this.hass!, this._config!, true, false);
  }

  private _handleDblClick(): void {
    handleClick(this, this.hass!, this._config!, false, true);
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
        align-items: center;
      }
      ha-paper-dropdown-menu {
        margin-left: 16px;
        flex: 1;
      }

      paper-item {
        cursor: pointer;
        min-width: 200px;
      }
      .pointer {
        cursor: pointer;
      }
    `;
  }

  private _selectedChanged(ev): void {
    const stateObj = this.hass!.states[this._config!.entity];
    const option = ev.target.selectedItem.innerText.trim();
    if (option === stateObj.state) {
      return;
    }

    forwardHaptic("light");

    setInputSelectOption(this.hass!, stateObj.entity_id, option);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-input-select-entity-row": HuiInputSelectEntityRow;
  }
}
