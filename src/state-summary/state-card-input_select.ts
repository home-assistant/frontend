import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-item/paper-item";
import type { PaperItemElement } from "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { stopPropagation } from "../common/dom/stop_propagation";
import { computeStateName } from "../common/entity/compute_state_name";
import "../components/entity/state-badge";
import { InputSelectEntity, setInputSelectOption } from "../data/input_select";
import type { PolymerIronSelectEvent } from "../polymer-types";
import type { HomeAssistant } from "../types";

@customElement("state-card-input_select")
class StateCardInputSelect extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

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
            (option) => html` <paper-item>${option}</paper-item> `
          )}
        </paper-listbox>
      </paper-dropdown-menu-light>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    // Update selected after rendering the items or else it won't work in Firefox
    this.shadowRoot!.querySelector("paper-listbox")!.selected =
      this.stateObj.attributes.options.indexOf(this.stateObj.state);
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

  static get styles(): CSSResultGroup {
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
