import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { ensureArray } from "../../../../../common/array/ensure-array";
import { createDurationData } from "../../../../../common/datetime/create_duration_data";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { TimeChangedEvent } from "../../../../../components/ha-base-time-input";
import "../../../../../components/ha-duration-input";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-textfield";
import type { WaitForTriggerAction } from "../../../../../data/script";
import type { HomeAssistant } from "../../../../../types";
import "../../trigger/ha-automation-trigger";
import type { ActionElement } from "../ha-automation-action-row";
import { handleChangeEvent } from "../ha-automation-action-row";

@customElement("ha-automation-action-wait_for_trigger")
export class HaWaitForTriggerAction
  extends LitElement
  implements ActionElement
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public action!: WaitForTriggerAction;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean, attribute: "sidebar" }) public inSidebar = false;

  @property({ type: Boolean, attribute: "sidebar" }) public indent = false;

  public static get defaultConfig(): WaitForTriggerAction {
    return { wait_for_trigger: [] };
  }

  protected render() {
    const timeData = createDurationData(this.action.timeout);

    return html`
      ${this.inSidebar || (!this.inSidebar && !this.indent)
        ? html`
            <ha-duration-input
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.wait_for_trigger.timeout"
              )}
              .data=${timeData}
              .disabled=${this.disabled}
              enable-millisecond
              @value-changed=${this._timeoutChanged}
            ></ha-duration-input>
            <ha-formfield
              .disabled=${this.disabled}
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.actions.type.wait_for_trigger.continue_timeout"
              )}
            >
              <ha-switch
                .checked=${this.action.continue_on_timeout ?? true}
                .disabled=${this.disabled}
                @change=${this._continueChanged}
              ></ha-switch>
            </ha-formfield>
          `
        : nothing}
      ${this.indent || (!this.inSidebar && !this.indent)
        ? html`<ha-automation-trigger
            class=${!this.inSidebar && !this.indent ? "expansion-panel" : ""}
            .triggers=${ensureArray(this.action.wait_for_trigger)}
            .hass=${this.hass}
            .disabled=${this.disabled}
            .name=${"wait_for_trigger"}
            @value-changed=${this._valueChanged}
            .optionsInSidebar=${this.indent}
          ></ha-automation-trigger>`
        : nothing}
    `;
  }

  private _timeoutChanged(ev: CustomEvent<{ value: TimeChangedEvent }>): void {
    ev.stopPropagation();
    const value = ev.detail.value;
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

  static styles = css`
    ha-duration-input {
      display: block;
      margin-bottom: 24px;
    }
    ha-automation-trigger.expansion-panel {
      display: block;
      margin-top: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-wait_for_trigger": HaWaitForTriggerAction;
  }
}
