import "../../../../../components/ha-textfield";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-formfield";
import { WaitForTriggerAction } from "../../../../../data/script";
import { HomeAssistant } from "../../../../../types";
import "../../trigger/ha-automation-trigger";
import { ActionElement, handleChangeEvent } from "../ha-automation-action-row";
import "../../../../../components/ha-duration-input";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";

@customElement("ha-automation-action-wait_for_trigger")
export class HaWaitForTriggerAction
  extends LitElement
  implements ActionElement
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public action!: WaitForTriggerAction;

  public static get defaultConfig() {
    return { wait_for_trigger: [] };
  }

  protected render() {
    const { wait_for_trigger, continue_on_timeout } = this.action;
    const timeData = createDurationData(this.action.timeout);

    return html`
      <ha-duration-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.wait_for_trigger.timeout"
        )}
        .data=${timeData}
        enableMillisecond
        @value-changed=${this._timeoutChanged}
      ></ha-duration-input>
      <ha-formfield
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.wait_for_trigger.continue_timeout"
        )}
      >
        <ha-switch
          .checked=${continue_on_timeout ?? true}
          @change=${this._continueChanged}
        ></ha-switch>
      </ha-formfield>
      <ha-automation-trigger
        .triggers=${wait_for_trigger}
        .hass=${this.hass}
        .name=${"wait_for_trigger"}
        @value-changed=${this._valueChanged}
      ></ha-automation-trigger>
    `;
  }

  private _timeoutChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const value = ev.detail.value;
    if (!value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { ...this.action, timeout: value },
    });
  }

  private _continueChanged(ev) {
    fireEvent(this, "value-changed", {
      value: { ...this.action, continue_on_timeout: ev.target.checked },
    });
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-duration-input {
        display: block;
        margin-bottom: 24px;
      }
      ha-automation-trigger {
        display: block;
        margin-top: 24px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-wait_for_trigger": HaWaitForTriggerAction;
  }
}
