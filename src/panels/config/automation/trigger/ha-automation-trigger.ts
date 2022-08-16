import { mdiPlus } from "@mdi/js";
import deepClone from "deep-clone-simple";
import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-svg-icon";
import { Trigger } from "../../../../data/automation";
import { HomeAssistant } from "../../../../types";
import "./ha-automation-trigger-row";
import type HaAutomationTriggerRow from "./ha-automation-trigger-row";
import { HaDeviceTrigger } from "./types/ha-automation-trigger-device";

@customElement("ha-automation-trigger")
export default class HaAutomationTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public triggers!: Trigger[];

  private _focusLastTriggerOnChange = false;

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
      <mwc-button
        outlined
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.add"
        )}
        @click=${this._addTrigger}
      >
        <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
      </mwc-button>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("triggers") && this._focusLastTriggerOnChange) {
      this._focusLastTriggerOnChange = false;

      const row = this.shadowRoot!.querySelector<HaAutomationTriggerRow>(
        "ha-automation-trigger-row:last-of-type"
      )!;
      row.toggleExpanded();
      row.focus();
    }
  }

  private _addTrigger() {
    const triggers = this.triggers.concat({
      platform: "device",
      ...HaDeviceTrigger.defaultConfig,
    });
    this._focusLastTriggerOnChange = true;
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
      value: this.triggers.concat(deepClone(this.triggers[index])),
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-automation-trigger-row {
        display: block;
        margin-bottom: 16px;
      }
      ha-svg-icon {
        height: 20px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger": HaAutomationTrigger;
  }
}
