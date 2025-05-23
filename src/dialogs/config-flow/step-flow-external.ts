import "@material/mwc-button";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { DataEntryFlowStepExternal } from "../../data/data_entry_flow";
import type { HomeAssistant } from "../../types";
import type { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-external")
class StepFlowExternal extends LitElement {
  @property({ attribute: false }) public flowConfig!: FlowConfig;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public step!: DataEntryFlowStepExternal;

  protected render(): TemplateResult {
    const localize = this.hass.localize;

    return html`
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

  static get styles(): CSSResultGroup {
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
