import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { ifDefined } from "lit/directives/if-defined";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-button";
import "../../components/ha-dialog-footer";
import "../../components/ha-wa-dialog";
import "../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../components/ha-form/types";
import "../../components/ha-markdown";
import "../../components/ha-spinner";
import { autocompleteLoginFields } from "../../data/auth";
import type {
  DataEntryFlowStep,
  DataEntryFlowStepForm,
} from "../../data/data_entry_flow";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";

let instance = 0;

@customElement("ha-mfa-module-setup-flow")
class HaMfaModuleSetupFlow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogClosedCallback?: (params: {
    flowFinished: boolean;
  }) => void;

  @state() private _instance?: number;

  @state() private _loading = false;

  @state() private _open = false;

  @state() private _stepData: any = {};

  @state() private _step?: DataEntryFlowStep;

  @state() private _errorMessage?: string;

  public showDialog({ continueFlowId, mfaModuleId, dialogClosedCallback }) {
    this._instance = instance++;
    this._dialogClosedCallback = dialogClosedCallback;
    this._open = true;

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
    this._open = false;
  }

  private _dialogClosed() {
    if (this._step) {
      this._flowDone();
      return;
    }

    this._resetDialogState();
  }

  protected render() {
    if (this._instance === undefined) {
      return nothing;
    }
    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        prevent-scrim-close
        header-title=${this._computeStepTitle()}
        @closed=${this._dialogClosed}
      >
        <div>
          ${this._errorMessage
            ? html`<div class="error">${this._errorMessage}</div>`
            : ""}
          ${!this._step
            ? html`<div class="init-spinner">
                <ha-spinner></ha-spinner>
              </div>`
            : html`${this._step.type === "abort"
                ? html` <ha-markdown
                    allow-svg
                    breaks
                    .content=${this.hass.localize(
                      `component.auth.mfa_setup.${this._step.handler}.abort.${this._step.reason}`
                    )}
                  ></ha-markdown>`
                : this._step.type === "create_entry"
                  ? html`<p>
                      ${this.hass.localize(
                        "ui.panel.profile.mfa_setup.step_done",
                        { step: this._step.title || this._step.handler }
                      )}
                    </p>`
                  : this._step.type === "form"
                    ? html`<ha-markdown
                          allow-svg
                          breaks
                          .content=${this.hass.localize(
                            `component.auth.mfa_setup.${
                              this._step!.handler
                            }.step.${
                              (this._step! as DataEntryFlowStepForm).step_id
                            }.description`,
                            this._step!.description_placeholders
                          )}
                        ></ha-markdown>
                        <ha-form
                          autofocus
                          .hass=${this.hass}
                          .data=${this._stepData}
                          .schema=${autocompleteLoginFields(
                            this._step.data_schema
                          )}
                          .error=${this._step.errors}
                          .computeLabel=${this._computeLabel}
                          .computeError=${this._computeError}
                          @value-changed=${this._stepDataChanged}
                        ></ha-form>`
                    : ""}`}
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot=${this._step?.type === "form"
              ? "secondaryAction"
              : "primaryAction"}
            appearance=${ifDefined(
              this._step?.type === "form" ? "plain" : undefined
            )}
            @click=${this.closeDialog}
            >${this.hass.localize(
              ["abort", "create_entry"].includes(this._step?.type || "")
                ? "ui.panel.profile.mfa_setup.close"
                : "ui.common.cancel"
            )}</ha-button
          >
          ${this._step?.type === "form"
            ? html`<ha-button
                slot="primaryAction"
                .disabled=${this._isSubmitDisabled()}
                @click=${this._submitStep}
                >${this.hass.localize(
                  "ui.panel.profile.mfa_setup.submit"
                )}</ha-button
              >`
            : nothing}
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .error {
          color: red;
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
        ha-markdown-element p {
          text-align: center;
        }
        ha-markdown-element svg {
          display: block;
          margin: 0 auto;
        }
        ha-markdown-element code {
          background-color: transparent;
        }
        ha-form {
          display: block;
          margin-top: var(--ha-space-4);
        }
        ha-markdown-element > *:last-child {
          margin-bottom: revert;
        }
        .init-spinner {
          padding: 10px 100px 34px;
          text-align: center;
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
    if (this._isSubmitDisabled()) {
      return;
    }

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

  private _isSubmitDisabled() {
    return this._loading || this._hasMissingRequiredFields();
  }

  private _hasMissingRequiredFields(
    schema: readonly HaFormSchema[] = this._step?.type === "form"
      ? this._step.data_schema
      : []
  ): boolean {
    for (const field of schema) {
      if ("schema" in field) {
        if (this._hasMissingRequiredFields(field.schema)) {
          return true;
        }
        continue;
      }

      if (!field.required) {
        continue;
      }

      if (
        field.default !== undefined ||
        field.description?.suggested_value !== undefined
      ) {
        continue;
      }

      if (this._isEmptyValue(this._stepData[field.name])) {
        return true;
      }
    }

    return false;
  }

  private _isEmptyValue(value: unknown): boolean {
    if (value === undefined || value === null) {
      return true;
    }

    if (typeof value === "string") {
      return value.trim() === "";
    }

    if (Array.isArray(value)) {
      return value.length === 0;
    }

    if (typeof value === "object") {
      return Object.keys(value as Record<string, unknown>).length === 0;
    }

    return false;
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
    this._resetDialogState();
  }

  private _resetDialogState() {
    this._errorMessage = undefined;
    this._step = undefined;
    this._stepData = {};
    this._dialogClosedCallback = undefined;
    this._instance = undefined;
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
