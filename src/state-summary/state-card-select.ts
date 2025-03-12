import "@material/mwc-list/mwc-list-item";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { stopPropagation } from "../common/dom/stop_propagation";
import { computeStateName } from "../common/entity/compute_state_name";
import "../components/entity/state-badge";
import "../components/ha-select";
import { UNAVAILABLE } from "../data/entity";
import type { SelectEntity } from "../data/select";
import { setSelectOption } from "../data/select";
import type { HomeAssistant } from "../types";
import type { HaSelect } from "../components/ha-select";

@customElement("state-card-select")
class StateCardSelect extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: SelectEntity;

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
        const newIdx = this.stateObj.attributes.options.findIndex(
          (option) => option === this.stateObj.state
        );
        if (newIdx >= 0) {
          this._haSelect.select(newIdx);
        }
      }
    }
  }

  protected render(): TemplateResult {
    return html`
      <state-badge .hass=${this.hass} .stateObj=${this.stateObj}></state-badge>
      <ha-select
        .value=${this.stateObj.state}
        .label=${computeStateName(this.stateObj)}
        .disabled=${this.stateObj.state === UNAVAILABLE}
        naturalMenuWidth
        fixedMenuPosition
        @selected=${this._selectedOptionChanged}
        @closed=${stopPropagation}
      >
        ${this.stateObj.attributes.options.map(
          (option) => html`
            <mwc-list-item .value=${option}>
              ${this.hass.formatEntityState(this.stateObj, option)}
            </mwc-list-item>
          `
        )}
      </ha-select>
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

    ha-select {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-select": StateCardSelect;
  }
}
