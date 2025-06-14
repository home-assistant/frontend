import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { blankBeforePercent } from "../../common/translations/blank_before_percent";
import "../../components/ha-progress-ring";
import "../../components/ha-spinner";
import type { DataEntryFlowStepProgress } from "../../data/data_entry_flow";
import type { HomeAssistant } from "../../types";
import type { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-progress")
class StepFlowProgress extends LitElement {
  @property({ attribute: false })
  public flowConfig!: FlowConfig;

  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ attribute: false })
  public step!: DataEntryFlowStepProgress;

  @property({ type: Number })
  public progress?: number;

  protected render(): TemplateResult {
    return html`
      <div class="content">
        ${this.progress
          ? html`
              <ha-progress-ring .value=${this.progress} size="large"
                >${this.progress}${blankBeforePercent(
                  this.hass.locale
                )}%</ha-progress-ring
              >
            `
          : html` <ha-spinner size="large"></ha-spinner> `}
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
