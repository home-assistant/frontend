import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-circular-progress";
import "../../components/ha-dialog";
import "../../components/ha-form/ha-form";
import "../../components/ha-markdown";
import { autocompleteLoginFields } from "../../data/auth";
import {
  DataEntryFlowStep,
  DataEntryFlowStepForm,
} from "../../data/data_entry_flow";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";

let instance = 0;

@customElement("ha-mfa-module-setup-flow")
class HaMfaModuleSetupFlow extends LitElement {
  @property() public hass!: HomeAssistant;

  @state() private _dialogClosedCallback?: (params: {
    flowFinished: boolean;
  }) => void;

  @state() private _instance?: number;

  @state() private _loading = false;

  @state() private _opened = false;

  @state() private _stepData: any = {};

  @state() private _step?: DataEntryFlowStep;

  @state() private _errorMessage?: string;

  public showDialog({ continueFlowId, mfaModuleId, dialogClosedCallback }) {
    this._instance = instance++;
    this._dialogClosedCallback = dialogClosedCallback;
    this._opened = true;

    const fetchStep = continueFlowId
      ? this.hass.callWS({
          type: "auth/setup_mfa",
          flow_id: continueFlowId,
        })
      : this.hass.callWS({
          type: "auth/setup_mfa",
          mfa_module_id: mfaModuleId,
        });

    const curInstance = this._instance;

    fetchStep.then((step) => {
      if (curInstance !== this._instance) return;

      this._processStep(step);
    });
  }

  public closeDialog() {
    // Closed dialog by clicking on the overlay
    if (this._step) {
      this._flowDone();
    }
    this._opened = false;
  }

  protected render() {
    if (!this._opened) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        .heading=${this._computeStepTitle()}
        @closed=${this.closeDialog}
      >
        <div>
          ${this._errorMessage
            ? html`<div class="error">${this._errorMessage}</div>`
            : ""}
          ${!this._step
            ? html`<div class="init-spinner">
                <ha-circular-progress active></ha-circular-progress>
              </div>`
            : html`${this._step.type === "abort"
                ? html` <ha-markdown
                    allowsvg
                    breaks
                    .content=${this.hass.localize(
                      `component.auth.mfa_setup.${this._step.handler}.abort.${this._step.reason}`
                    )}
                  ></ha-markdown>`
                : this._step.type === "create_entry"
                ? html`<p>
                    ${this.hass.localize(
                      "ui.panel.profile.mfa_setup.step_done",
                      "step",
                      this._step.title
                    )}
                  </p>`
                : this._step.type === "form"
                ? html`<ha-markdown
                      allowsvg
                      breaks
                      .content=${this.hass.localize(
                        `component.auth.mfa_setup.${this._step!.handler}.step.${
                          (this._step! as DataEntryFlowStepForm).step_id
                        }.description`,
                        this._step!.description_placeholders
                      )}
                    ></ha-markdown>
                    <ha-form
                      .hass=${this.hass}
                      .data=${this._stepData}
                      .schema=${autocompleteLoginFields(this._step.data_schema)}
                      .error=${this._step.errors}
                      .computeLabel=${this._computeLabel}
                      .computeError=${this._computeError}
                      @value-changed=${this._stepDataChanged}
                    ></ha-form>`
                : ""}`}
        </div>
        ${["abort", "create_entry"].includes(this._step?.type || "")
          ? html`<mwc-button slot="primaryAction" @click=${this.closeDialog}
              >${this.hass.localize(
                "ui.panel.profile.mfa_setup.close"
              )}</mwc-button
            >`
          : ""}
        ${this._step?.type === "form"
          ? html`<mwc-button
              slot="primaryAction"
              .disabled=${this._loading}
              @click=${this._submitStep}
              >${this.hass.localize(
                "ui.panel.profile.mfa_setup.submit"
              )}</mwc-button
            >`
          : ""}
      </ha-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .error {
          color: red;
        }
        ha-dialog {
          max-width: 500px;
        }
        ha-markdown {
          --markdown-svg-background-color: white;
          --markdown-svg-color: black;
          display: block;
          margin: 0 auto;
        }
        ha-markdown a {
          color: var(--primary-color);
        }
        .init-spinner {
          padding: 10px 100px 34px;
          text-align: center;
        }
        .submit-spinner {
          margin-right: 16px;
        }
      `,
    ];
  }

  protected firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);
    this.hass.loadBackendTranslation("mfa_setup", "auth");
    this.addEventListener("keypress", (ev) => {
      if (ev.key === "Enter") {
        this._submitStep();
      }
    });
  }

  private _stepDataChanged(ev: CustomEvent) {
    this._stepData = ev.detail.value;
  }

  private _submitStep() {
    this._loading = true;
    this._errorMessage = undefined;

    const curInstance = this._instance;

    this.hass
      .callWS({
        type: "auth/setup_mfa",
        flow_id: this._step!.flow_id,
        user_input: this._stepData,
      })
      .then(
        (step) => {
          if (curInstance !== this._instance) {
            return;
          }

          this._processStep(step);
          this._loading = false;
        },
        (err) => {
          this._errorMessage =
            (err && err.body && err.body.message) || "Unknown error occurred";
          this._loading = false;
        }
      );
  }

  private _processStep(step) {
    if (!step.errors) step.errors = {};
    this._step = step;
    // We got a new form if there are no errors.
    if (Object.keys(step.errors).length === 0) {
      this._stepData = {};
    }
  }

  private _flowDone() {
    const flowFinished = Boolean(
      this._step && ["create_entry", "abort"].includes(this._step.type)
    );

    this._dialogClosedCallback!({
      flowFinished,
    });

    this._errorMessage = undefined;
    this._step = undefined;
    this._stepData = {};
    this._dialogClosedCallback = undefined;
    this.closeDialog();
  }

  private _computeStepTitle() {
    return this._step?.type === "abort"
      ? this.hass.localize("ui.panel.profile.mfa_setup.title_aborted")
      : this._step?.type === "create_entry"
      ? this.hass.localize("ui.panel.profile.mfa_setup.title_success")
      : this._step?.type === "form"
      ? this.hass.localize(
          `component.auth.mfa_setup.${this._step.handler}.step.${this._step.step_id}.title`
        )
      : "";
  }

  private _computeLabel = (schema) =>
    this.hass.localize(
      `component.auth.mfa_setup.${this._step!.handler}.step.${
        (this._step! as DataEntryFlowStepForm).step_id
      }.data.${schema.name}`
    ) || schema.name;

  private _computeError = (error) =>
    this.hass.localize(
      `component.auth.mfa_setup.${this._step!.handler}.error.${error}`
    ) || error;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-mfa-module-setup-flow": HaMfaModuleSetupFlow;
  }
}
