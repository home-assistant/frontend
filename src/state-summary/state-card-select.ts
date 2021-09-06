import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
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
import { customElement, property } from "lit/decorators";
import { stopPropagation } from "../common/dom/stop_propagation";
import { computeStateName } from "../common/entity/compute_state_name";
import "../components/entity/state-badge";
import { SelectEntity, setSelectOption } from "../data/select";
import type { HomeAssistant } from "../types";

@customElement("state-card-select")
class StateCardSelect extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj!: SelectEntity;

  protected render(): TemplateResult {
    return html`
      <state-badge .stateObj=${this.stateObj}></state-badge>
      <paper-dropdown-menu-light
        .label=${computeStateName(this.stateObj)}
        @iron-select=${this._selectedOptionChanged}
        @click=${stopPropagation}
      >
        <paper-listbox slot="dropdown-content">
          ${this.stateObj.attributes.options.map(
            (option) =>
              html`
                <paper-item .option=${option}
                  >${(this.stateObj.attributes.device_class &&
                    this.hass.localize(
                      `component.select.state.${this.stateObj.attributes.device_class}.${option}`
                    )) ||
                  this.hass.localize(`component.select.state._.${option}`) ||
                  option}</paper-item
                >
              `
          )}
        </paper-listbox>
      </paper-dropdown-menu-light>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (!changedProps.has("stateObj")) {
      return;
    }
    // Update selected after rendering the items or else it won't work in Firefox
    this.shadowRoot!.querySelector("paper-listbox")!.selected =
      this.stateObj.attributes.options.indexOf(this.stateObj.state);
  }

  private _selectedOptionChanged(ev) {
    const option = ev.target.selectedItem.option;
    if (option === this.stateObj.state) {
      return;
    }
    setSelectOption(this.hass, this.stateObj.entity_id, option);
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
    "state-card-select": StateCardSelect;
  }
}
