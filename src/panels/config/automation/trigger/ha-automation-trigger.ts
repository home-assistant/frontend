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

import "./ha-automation-trigger-row";
import { HaStateTrigger } from "./types/ha-automation-trigger-state";
import { Trigger } from "../../../../data/automation";

@customElement("ha-automation-trigger")
export default class HaAutomationTrigger extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public triggers!: Trigger[];

  protected render() {
    return html`
      ${this.triggers.map(
        (trg, idx) => html`
          <ha-automation-trigger-row
            .index=${idx}
            .trigger=${trg}
            @value-changed=${this._triggerChanged}
            .hass=${this.hass}
          ></ha-automation-trigger-row>
        `
      )}
      <ha-card>
        <div class="card-actions add-card">
          <mwc-button @click=${this._addTrigger}>
            ${this.hass.localize(
              "ui.panel.config.automation.editor.triggers.add"
            )}
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  private _addTrigger() {
    const triggers = this.triggers.concat({
      platform: "state",
      ...HaStateTrigger.defaultConfig,
    });

    fireEvent(this, "value-changed", { value: triggers });
  }

  private _triggerChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const triggers = [...this.triggers];
    const newValue = ev.detail.value;
    const index = (ev.target as any).index;

    if (newValue === null) {
      triggers.splice(index, 1);
    } else {
      triggers[index] = newValue;
    }

    fireEvent(this, "value-changed", { value: triggers });
  }

  static get styles(): CSSResult {
    return css`
      ha-automation-trigger-row,
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
    "ha-automation-trigger": HaAutomationTrigger;
  }
}
