import {
  LitElement,
  TemplateResult,
  html,
  customElement,
  property,
  CSSResult,
} from "lit-element";
import "@material/mwc-button";

import { DataEntryFlowStepAbort } from "../../data/data_entry_flow";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { configFlowContentStyles } from "./styles";
import { FlowConfig } from "./show-dialog-data-entry-flow";

@customElement("step-flow-abort")
class StepFlowAbort extends LitElement {
  public flowConfig!: FlowConfig;

  @property()
  public hass!: HomeAssistant;

  @property()
  private step!: DataEntryFlowStepAbort;

  protected render(): TemplateResult {
    return html`
      <h2>
        ${this.hass.localize(
          "ui.panel.config.integrations.config_flow.aborted"
        )}
      </h2>
      <div class="content">
        ${this.flowConfig.renderAbortDescription(this.hass, this.step)}
      </div>
      <div class="buttons">
        <mwc-button @click="${this._flowDone}"
          >${this.hass.localize(
            "ui.panel.config.integrations.config_flow.close"
          )}</mwc-button
        >
      </div>
    `;
  }

  private _flowDone(): void {
    fireEvent(this, "flow-update", { step: undefined });
  }

  static get styles(): CSSResult {
    return configFlowContentStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-abort": StepFlowAbort;
  }
}
