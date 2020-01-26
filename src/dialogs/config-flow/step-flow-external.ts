import {
  LitElement,
  TemplateResult,
  html,
  customElement,
  property,
  CSSResultArray,
  css,
} from "lit-element";
import "@material/mwc-button";

import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { configFlowContentStyles } from "./styles";
import {
  DataEntryFlowStepExternal,
  DataEntryFlowProgressedEvent,
} from "../../data/data_entry_flow";
import { FlowConfig } from "./show-dialog-data-entry-flow";

@customElement("step-flow-external")
class StepFlowExternal extends LitElement {
  public flowConfig!: FlowConfig;

  @property()
  public hass!: HomeAssistant;

  @property()
  private step!: DataEntryFlowStepExternal;

  protected render(): TemplateResult {
    const localize = this.hass.localize;

    return html`
      <h2>
        ${this.flowConfig.renderExternalStepHeader(this.hass, this.step)}
      </h2>
      <div class="content">
        ${this.flowConfig.renderExternalStepDescription(this.hass, this.step)}
        <div class="open-button">
          <a href=${this.step.url} target="_blank">
            <mwc-button raised>
              ${localize(
                "ui.panel.config.integrations.config_flow.external_step.open_site"
              )}
            </mwc-button>
          </a>
        </div>
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
    window.open(this.step.url);
  }

  static get styles(): CSSResultArray {
    return [
      configFlowContentStyles,
      css`
        .open-button {
          text-align: center;
          padding: 24px 0;
        }
        .open-button a {
          text-decoration: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-external": StepFlowExternal;
  }
}
