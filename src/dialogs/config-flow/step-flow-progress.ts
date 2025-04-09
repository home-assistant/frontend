import type { DataEntryFlowStepProgress } from "../../data/data_entry_flow";
import type { HomeAssistant } from "../../types";
import type { FlowConfig } from "./show-dialog-data-entry-flow";
import type { CSSResultGroup, TemplateResult } from "lit";

import "../../components/ha-spinner";
import "@material/mwc-button";

import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";

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
        <ha-spinner></ha-spinner>
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
        ha-spinner {
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
