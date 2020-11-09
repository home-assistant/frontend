import "@material/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-circular-progress";
import {
  DataEntryFlowProgressedEvent,
  DataEntryFlowStepProgress,
} from "../../data/data_entry_flow";
import { HomeAssistant } from "../../types";
import { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-progress")
class StepFlowProgress extends LitElement {
  public flowConfig!: FlowConfig;

  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property({ attribute: false })
  private step!: DataEntryFlowStepProgress;

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

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.hass.connection.subscribeEvents<DataEntryFlowProgressedEvent>(
      async (ev) => {
        if (ev.data.flow_id !== this.step.flow_id) {
          return;
        }

        fireEvent(this, "flow-update", {
          stepPromise: this.flowConfig.fetchFlow(this.hass, this.step.flow_id),
        });
      },
      "data_entry_flow_progressed"
    );
  }

  static get styles(): CSSResult[] {
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
