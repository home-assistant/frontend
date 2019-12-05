import {
  LitElement,
  customElement,
  html,
  property,
  CSSResult,
  css,
} from "lit-element";
import "@material/mwc-button";
import "../../../../components/ha-card";

import { fireEvent } from "../../../../common/dom/fire_event";
import { HomeAssistant } from "../../../../types";

import "./ha-automation-condition-row";
// tslint:disable-next-line
import { Condition } from "./ha-automation-condition-row";

@customElement("ha-automation-condition")
export default class HaAutomationCondition extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public conditions!: Condition[];

  protected render() {
    return html`
      ${this.conditions.map(
        (cond, idx) => html`
          <ha-automation-condition-row
            .index=${idx}
            .condition=${cond}
            @value-changed=${this._conditionChanged}
            .hass=${this.hass}
          ></ha-automation-condition-row>
        `
      )}
      <ha-card>
        <div class="card-actions add-card">
          <mwc-button @click=${this._addCondition}>
            ${this.hass.localize(
              "ui.panel.config.automation.editor.conditions.add"
            )}
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  private _addCondition() {
    const conditions = this.conditions.concat({
      condition: "state",
      entity_id: "",
      state: "",
    });

    fireEvent(this, "value-changed", { value: conditions });
  }

  private _conditionChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const conditions = [...this.conditions];
    const newValue = ev.detail.value;
    const index = (ev.target as any).index;

    if (newValue === null) {
      conditions.splice(index, 1);
    } else {
      conditions[index] = newValue;
    }

    fireEvent(this, "value-changed", { value: conditions });
  }

  static get styles(): CSSResult {
    return css`
      ha-automation-condition-row,
      ha-card {
        display: block;
        margin-top: 16px;
      }
      .add-card mwc-button {
        display: block;
        text-align: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition": HaAutomationCondition;
  }
}
