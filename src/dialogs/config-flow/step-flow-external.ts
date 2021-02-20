import "@material/mwc-button";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { DataEntryFlowStepExternal } from "../../data/data_entry_flow";
import { HomeAssistant } from "../../types";
import { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

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
          <a href=${this.step.url} target="_blank" rel="noreferrer">
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
