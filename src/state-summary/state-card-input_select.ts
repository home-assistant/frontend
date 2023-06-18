import "@material/mwc-list/mwc-list-item";
import "../components/ha-select";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  TemplateResult,
  PropertyValues,
} from "lit";
import { customElement, property, query } from "lit/decorators";
import { stopPropagation } from "../common/dom/stop_propagation";
import { computeStateName } from "../common/entity/compute_state_name";
import "../components/entity/state-badge";
import { UNAVAILABLE } from "../data/entity";
import { InputSelectEntity, setInputSelectOption } from "../data/input_select";
import type { HomeAssistant } from "../types";
import type { HaSelect } from "../components/ha-select";

@customElement("state-card-input_select")
class StateCardInputSelect extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public stateObj!: InputSelectEntity;

  @query("ha-select", true) private _haSelect!: HaSelect;

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("stateObj")) {
      const oldState = changedProps.get("stateObj");
      if (
        oldState &&
        this.stateObj.attributes.options !== oldState.attributes.options
      ) {
        this._haSelect.layoutOptions();
      }
    }
  }

  protected render(): TemplateResult {
    return html`
      <state-badge .stateObj=${this.stateObj}></state-badge>
      <ha-select
        .label=${computeStateName(this.stateObj)}
        .value=${this.stateObj.state}
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
            html`<mwc-list-item .value=${option}>${option}</mwc-list-item>`
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

  static get styles(): CSSResultGroup {
    return css`
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
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-input_select": StateCardInputSelect;
  }
}
