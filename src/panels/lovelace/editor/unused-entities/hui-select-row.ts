import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";

import { Checkbox } from "@material/mwc-checkbox";
import { HomeAssistant } from "../../../../types";
import computeStateName from "../../../../common/entity/compute_state_name";
import computeDomain from "../../../../common/entity/compute_domain";

import "../../../../components/ha-checkbox";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-relative-time";
import "../../../../components/ha-icon";

import { fireEvent } from "../../../../common/dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "entity-selection-changed": EntitySelectionChangedEvent;
  }
}

export interface EntitySelectionChangedEvent {
  entity: string;
  selected: boolean;
}

@customElement("hui-select-row")
class HuiSelectRow extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() public entity?: string;

  protected render(): TemplateResult | void {
    if (!this.entity || !this.hass) {
      return;
    }

    const stateObj = this.entity ? this.hass.states[this.entity] : undefined;

    if (!stateObj) {
      return;
    }

    return html`
      <td>
        <ha-checkbox @change=${this._handleSelect}></ha-checkbox>
        <state-badge .hass=${this.hass} .stateObj=${stateObj}></state-badge>
        ${computeStateName(stateObj)}
      </td>
      <td>${stateObj.entity_id}</td>
      <td>${computeDomain(stateObj.entity_id)}</td>
      <td>
        <ha-relative-time
          .hass=${this.hass}
          .datetime=${stateObj.last_changed}
        ></ha-relative-time>
      </td>
    `;
  }

  private _handleSelect(ev): void {
    const checkbox = ev.currentTarget as Checkbox;
    fireEvent(this, "entity-selection-changed", {
      entity: this.entity!,
      selected: checkbox.checked as boolean,
    });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: table-row;
      }

      td {
        text-align: left;
        padding: 12px 24px;
        vertical-align: middle;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-select-row": HuiSelectRow;
  }
}
