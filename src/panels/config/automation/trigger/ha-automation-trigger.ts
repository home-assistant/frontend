import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-card";
import { Trigger } from "../../../../data/automation";
import { HomeAssistant } from "../../../../types";
import "./ha-automation-trigger-row";
import { HaDeviceTrigger } from "./types/ha-automation-trigger-device";

@customElement("ha-automation-trigger")
export default class HaAutomationTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public triggers!: Trigger[];

  protected render() {
    return html`
      ${this.triggers.map(
        (trg, idx) => html`
          <ha-automation-trigger-row
            .index=${idx}
            .trigger=${trg}
            @duplicate=${this._duplicateTrigger}
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
      platform: "device",
      ...HaDeviceTrigger.defaultConfig,
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

  private _duplicateTrigger(ev: CustomEvent) {
    ev.stopPropagation();
    const index = (ev.target as any).index;
    fireEvent(this, "value-changed", {
      value: this.triggers.concat(this.triggers[index]),
    });
  }

  static get styles(): CSSResultGroup {
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
