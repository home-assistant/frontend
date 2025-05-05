import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { computeStateName } from "../common/entity/compute_state_name";
import "../components/entity/state-badge";
import "../components/ha-md-select";
import "../components/ha-md-select-option";
import { UNAVAILABLE } from "../data/entity";
import type { SelectEntity } from "../data/select";
import { setSelectOption } from "../data/select";
import type { HomeAssistant } from "../types";

@customElement("state-card-select")
class StateCardSelect extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: SelectEntity;

  protected render(): TemplateResult {
    return html`
      <state-badge .hass=${this.hass} .stateObj=${this.stateObj}></state-badge>
      <ha-md-select
        .label=${computeStateName(this.stateObj)}
        .value=${this.stateObj.state}
        .disabled=${this.stateObj.state === UNAVAILABLE}
        @change=${this._selectedOptionChanged}
      >
        ${this.stateObj.attributes.options.map(
          (option) => html`
            <ha-md-select-option .value=${option}>
              <div slot="headline">
                ${this.hass.formatEntityState(this.stateObj, option)}
              </div>
            </ha-md-select-option>
          `
        )}
      </ha-md-select>
    `;
  }

  private _selectedOptionChanged(ev) {
    const option = ev.target.value;
    if (option === this.stateObj.state) {
      return;
    }
    setSelectOption(this.hass, this.stateObj.entity_id, option);
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
    "state-card-select": StateCardSelect;
  }
}
