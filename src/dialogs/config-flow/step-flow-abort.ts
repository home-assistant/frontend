import "@material/mwc-button";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { DataEntryFlowStepAbort } from "../../data/data_entry_flow";
import { HomeAssistant } from "../../types";
import { showAddApplicationCredentialDialog } from "../../panels/config/application_credentials/show-dialog-add-application-credential";
import { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";
import {
  showConfirmationDialog,
} from "../generic/show-dialog-box";
import { domainToName } from "../../data/integration";
import { showConfigFlowDialog } from "./show-dialog-config-flow";

@customElement("step-flow-abort")
class StepFlowAbort extends LitElement {
  @property({ attribute: false }) public flowConfig!: FlowConfig;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public step!: DataEntryFlowStepAbort;

  @property({ attribute: false }) public domain!: string;

  protected firstUpdated(changed: PropertyValues) {
    super.firstUpdated(changed);
    if (this.step.reason === "missing_configuration") {
      this._handleMissingCreds();
    }
  }

  protected render(): TemplateResult {
    if (this.step.reason === "missing_configuration") {
      return html``;
    }
    return html`
      <h2>${this.hass.localize(`component.${this.domain}.title`)}</h2>
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

  private async _handleMissingCreds() {
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.integrations.config_flow.missing_creds",
          {
            integration: domainToName(this.hass.localize, this.domain),
          }
        ),
      }))
    ) {
      this._flowDone();
      return;
    }

    // Gap:  Need to check application credentials eligibility
    showAddApplicationCredentialDialog(this, {
      selectedDomain: this.domain,
      applicationCredentialAddedCallback: async (_: ApplicationCredential) => {
        showConfigFlowDialog(this, {
          dialogClosedCallback: () => {
            this._flowDone();
          },
          startFlowHandler: this.domain,
          showAdvanced: this.hass.userData?.showAdvanced,
        });
      },
    });
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
