import "@material/mwc-button";
import type { CSSResultGroup, PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { DataEntryFlowStepAbort } from "../../data/data_entry_flow";
import { showAddApplicationCredentialDialog } from "../../panels/config/application_credentials/show-dialog-add-application-credential";
import type { HomeAssistant } from "../../types";
import { showConfigFlowDialog } from "./show-dialog-config-flow";
import type { DataEntryFlowDialogParams } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-abort")
class StepFlowAbort extends LitElement {
  @property({ attribute: false }) public params!: DataEntryFlowDialogParams;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public step!: DataEntryFlowStepAbort;

  @property({ attribute: false }) public domain!: string;

  @property({ attribute: false }) public handler!: string;

  protected firstUpdated(changed: PropertyValues) {
    super.firstUpdated(changed);
    if (this.step.reason === "missing_credentials") {
      this._handleMissingCreds();
    }
  }

  protected render() {
    if (this.step.reason === "missing_credentials") {
      return nothing;
    }
    return html`
      <div class="content">
        ${this.params.flowConfig.renderAbortDescription(this.hass, this.step)}
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
    // Prompt to enter credentials and restart integration setup
    showAddApplicationCredentialDialog(this.params.dialogParentElement!, {
      selectedDomain: this.domain,
      manifest: this.params.manifest,
      applicationCredentialAddedCallback: () => {
        showConfigFlowDialog(this.params.dialogParentElement!, {
          dialogClosedCallback: this.params.dialogClosedCallback,
          startFlowHandler: this.handler,
          showAdvanced: this.hass.userData?.showAdvanced,
          navigateToResult: this.params.navigateToResult,
        });
      },
    });
    this._flowDone();
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
