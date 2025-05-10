import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { stopPropagation } from "../common/dom/stop_propagation";
import { computeStateName } from "../common/entity/compute_state_name";
import "../components/entity/state-badge";
import "../components/ha-list-item";
import "../components/ha-select";
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
      <ha-select
        .label=${computeStateName(this.stateObj)}
        .value=${this.stateObj.state}
        .options=${this.stateObj.attributes.options}
        .disabled=${
          this.stateObj.state === UNAVAILABLE /* UNKNOWN state is allowed */
        }
        naturalMenuWidth
        fixedMenuPosition
        @selected=${this._selectedOptionChanged}
        @closed=${stopPropagation}
      >
        ${this.stateObj.attributes.options.map(
          (option) =>
            html`<ha-list-item .value=${option}>${option}</ha-list-item>`
        )}
      </ha-select>
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

    ha-select {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-input_select": StateCardInputSelect;
  }
}
