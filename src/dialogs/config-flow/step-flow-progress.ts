import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../components/ha-circular-progress";
import { DataEntryFlowStepProgress } from "../../data/data_entry_flow";
import { HomeAssistant } from "../../types";
import { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-progress")
class StepFlowProgress extends LitElement {
  @property({ attribute: false })
  public flowConfig!: FlowConfig;

  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ attribute: false })
  public step!: DataEntryFlowStepProgress;

  protected render(): TemplateResult {
    return html`
      <h2>
        ${this.flowConfig.renderShowFormProgressHeader(this.hass, this.step)}
      </h2>
      <div class="content">
        <ha-circular-progress active></ha-circular-progress>
        ${this.flowConfig.renderShowFormProgressDescription(
          this.hass,
          this.step
        )}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      configFlowContentStyles,
      css`
        .content {
          padding: 50px 100px;
          text-align: center;
        }
        ha-circular-progress {
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-progress": StepFlowProgress;
  }
}
