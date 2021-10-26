import "@material/mwc-button";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { DataEntryFlowStepAbort } from "../../data/data_entry_flow";
import { HomeAssistant } from "../../types";
import { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-abort")
class StepFlowAbort extends LitElement {
  @property({ attribute: false }) public flowConfig!: FlowConfig;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public step!: DataEntryFlowStepAbort;

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
        <mwc-button @click=${this._flowDone}
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

  static get styles(): CSSResultGroup {
    return configFlowContentStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-abort": StepFlowAbort;
  }
}
