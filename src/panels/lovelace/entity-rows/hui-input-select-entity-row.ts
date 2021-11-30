import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { stopPropagation } from "../../../common/dom/stop_propagation";
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
import { handleAction } from "../common/handle-action";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { LovelaceRow } from "./types";

@customElement("hui-input-select-entity-row")
class HuiInputSelectEntityRow extends LitElement implements LovelaceRow {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: EntitiesCardEntityConfig;

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

    return html`
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        hideName
      >
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
      </hui-generic-entity-row>
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
      this.shadowRoot!.querySelector("paper-listbox")!.selected =
        stateObj.attributes.options.indexOf(stateObj.state);
    }
  }

  private _handleAction(ev: ActionHandlerEvent) {
    handleAction(this, this.hass!, this._config!, ev.detail.action!);
  }

  static get styles(): CSSResultGroup {
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
