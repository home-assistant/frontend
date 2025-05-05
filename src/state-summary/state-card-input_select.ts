import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { computeStateName } from "../common/entity/compute_state_name";
import "../components/entity/state-badge";
import "../components/ha-md-select";
import "../components/ha-md-select-option";
import { UNAVAILABLE } from "../data/entity";
import type { InputSelectEntity } from "../data/input_select";
import { setInputSelectOption } from "../data/input_select";
import type { HomeAssistant } from "../types";

@customElement("state-card-input_select")
class StateCardInputSelect extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: InputSelectEntity;

  protected render(): TemplateResult {
    return html`
      <state-badge .hass=${this.hass} .stateObj=${this.stateObj}></state-badge>
      <ha-md-select
        .label=${computeStateName(this.stateObj)}
        .value=${this.stateObj.state}
        .disabled=${
          this.stateObj.state === UNAVAILABLE /* UNKNOWN state is allowed */
        }
        @change=${this._selectedOptionChanged}
      >
        ${this.stateObj.attributes.options.map(
          (option) =>
            html`<ha-md-select-option .value=${option}>
              <div slot="headline">${option}</div>
            </ha-md-select-option>`
        )}
      </ha-md-select>
    `;
  }

  private async _selectedOptionChanged(ev) {
    const option = ev.target.value;
    if (option === this.stateObj.state) {
      return;
    }
    await setInputSelectOption(this.hass, this.stateObj.entity_id, option);
  }

  static styles = css`
    :host {
      display: flex;
    }

    state-badge {
      float: left;
      margin-top: 10px;
    }

    ha-md-select {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-input_select": StateCardInputSelect;
  }
}
