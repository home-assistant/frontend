import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { ifDefined } from "lit-html/directives/if-defined";
import { DOMAINS_HIDE_MORE_INFO } from "../../../common/const";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import "../../../components/entity/state-badge";
import "../../../components/ha-paper-dropdown-menu";
import { UNAVAILABLE_STATES } from "../../../data/entity";
import { forwardHaptic } from "../../../data/haptics";
import {
  InputSelectEntity,
  setInputSelectOption,
} from "../../../data/input_select";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";
import { EntitiesCardEntityConfig } from "../cards/types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { LovelaceRow } from "./types";

@customElement("hui-input-select-entity-row")
class HuiInputSelectEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @internalProperty() private _config?: EntitiesCardEntityConfig;

  public setConfig(config: EntitiesCardEntityConfig): void {
    if (!config || !config.entity) {
      throw new Error("Entity must be specified");
    }

    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity] as
      | InputSelectEntity
      | undefined;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const pointer =
      (this._config.tap_action && this._config.tap_action.action !== "none") ||
      (this._config.entity &&
        !DOMAINS_HIDE_MORE_INFO.includes(computeDomain(this._config.entity)));

    return html`
      <state-badge
        .stateObj=${stateObj}
        .stateColor=${this._config.state_color}
        .overrideIcon=${this._config.icon}
        .overrideImage=${this._config.image}
        class=${classMap({
          pointer,
        })}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this._config!.hold_action),
          hasDoubleClick: hasAction(this._config!.double_tap_action),
        })}
        tabindex=${ifDefined(pointer ? "0" : undefined)}
      ></state-badge>
      <ha-paper-dropdown-menu
        .label=${this._config.name || computeStateName(stateObj)}
        .value=${stateObj.state}
        .disabled=${UNAVAILABLE_STATES.includes(stateObj.state)}
        @iron-select=${this._selectedChanged}
        @click=${stopPropagation}
      >
        <paper-listbox slot="dropdown-content">
          ${stateObj.attributes.options
            ? stateObj.attributes.options.map(
                (option) => html` <paper-item>${option}</paper-item> `
              )
            : ""}
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
    if (stateObj.attributes.options) {
      this.shadowRoot!.querySelector(
        "paper-listbox"
      )!.selected = stateObj.attributes.options.indexOf(stateObj.state);
    }
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
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
      state-badge:focus {
        outline: none;
        background: var(--divider-color);
        border-radius: 100%;
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
