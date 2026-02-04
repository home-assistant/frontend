import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { computeStateName } from "../common/entity/compute_state_name";
import "../components/entity/state-badge";
import "../components/ha-control-select-menu";
import type { HaDropdownSelectEvent } from "../components/ha-dropdown";
import { UNAVAILABLE } from "../data/entity/entity";
import type { SelectEntity } from "../data/select";
import { setSelectOption } from "../data/select";
import type { HomeAssistant } from "../types";

@customElement("state-card-select")
class StateCardSelect extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj!: SelectEntity;

  protected render(): TemplateResult {
    const options = this.stateObj.attributes.options.map((option) => ({
      value: option,
      label: this.hass.formatEntityState(this.stateObj, option),
    }));

    return html`
      <state-badge .hass=${this.hass} .stateObj=${this.stateObj}></state-badge>
      <ha-control-select-menu
        .value=${this.stateObj.state}
        .label=${computeStateName(this.stateObj)}
        .options=${options}
        .disabled=${this.stateObj.state === UNAVAILABLE}
        hide-label
        show-arrow
        @wa-select=${this._selectedOptionChanged}
      ></ha-control-select-menu>
    `;
  }

  private async _selectedOptionChanged(ev: HaDropdownSelectEvent) {
    const option = ev.detail.item?.value;
    if (
      !option ||
      option === this.stateObj.state ||
      !this.stateObj.attributes.options.includes(option)
    ) {
      return;
    }
    await setSelectOption(this.hass, this.stateObj.entity_id, option);
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--ha-space-2);
    }

    ha-control-select-menu {
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "state-card-select": StateCardSelect;
  }
}
