import {
  LitElement,
  customElement,
  TemplateResult,
  html,
  CSSResult,
  css,
  property,
  PropertyValues,
} from "lit-element";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-item/paper-item";
// tslint:disable-next-line: no-duplicate-imports
import { PaperItemElement } from "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import "../components/entity/state-badge";

import { computeStateName } from "../common/entity/compute_state_name";
import { HomeAssistant, InputSelectEntity } from "../types";
import { setInputSelectOption } from "../data/input_select";
import { PolymerIronSelectEvent } from "../polymer-types";
import { stopPropagation } from "../common/dom/stop_propagation";

@customElement("state-card-input_select")
class StateCardInputSelect extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public stateObj!: InputSelectEntity;

  protected render(): TemplateResult {
    return html`
      <state-badge .stateObj=${this.stateObj}></state-badge>
      <paper-dropdown-menu-light
        .label=${computeStateName(this.stateObj)}
        .value="${this.stateObj.state}"
        @iron-select=${this._selectedOptionChanged}
        @click=${stopPropagation}
      >
        <paper-listbox slot="dropdown-content">
          ${this.stateObj.attributes.options.map(
            (option) => html`
              <paper-item>${option}</paper-item>
            `
          )}
        </paper-listbox>
      </paper-dropdown-menu-light>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    // Update selected after rendering the items or else it won't work in Firefox
    this.shadowRoot!.querySelector(
      "paper-listbox"
    )!.selected = this.stateObj.attributes.options.indexOf(this.stateObj.state);
  }

  private async _selectedOptionChanged(
    ev: PolymerIronSelectEvent<PaperItemElement>
  ) {
    const option = ev.detail.item.innerText.trim();
    if (option === this.stateObj.state) {
      return;
    }
    await setInputSelectOption(this.hass, this.stateObj.entity_id, option);
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
      }

      state-badge {
        float: left;
        margin-top: 10px;
      }

      paper-dropdown-menu-light {
        display: block;
        margin-left: 53px;
      }

      paper-item {
        cursor: pointer;
        min-width: 200px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-input_select": StateCardInputSelect;
  }
}
