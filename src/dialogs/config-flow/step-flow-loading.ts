import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../components/ha-spinner";
import type { DataEntryFlowStep } from "../../data/data_entry_flow";
import type { HomeAssistant } from "../../types";
import type { FlowConfig, LoadingReason } from "./show-dialog-data-entry-flow";

@customElement("step-flow-loading")
class StepFlowLoading extends LitElement {
  @property({ attribute: false }) public flowConfig!: FlowConfig;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public loadingReason!: LoadingReason;

  @property() public handler?: string;

  @property({ attribute: false }) public step?: DataEntryFlowStep | null;

  protected render(): TemplateResult {
    const description = this.flowConfig.renderLoadingDescription(
      this.hass,
      this.loadingReason,
      this.handler,
      this.step
    );
    return html`
      <div class="content">
        <ha-spinner size="large"></ha-spinner>
        ${description ? html`<div>${description}</div>` : ""}
      </div>
    `;
  }

  static styles = css`
    .content {
      margin-top: 0;
      padding: 50px 100px;
      text-align: center;
    }
    ha-spinner {
      margin-bottom: 16px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-loading": StepFlowLoading;
  }
}
