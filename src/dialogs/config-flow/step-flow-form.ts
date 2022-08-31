import "@material/mwc-button";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-alert";
import "../../components/ha-circular-progress";
import { computeInitialHaFormData } from "../../components/ha-form/compute-initial-ha-form-data";
import "../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../components/ha-form/types";
import "../../components/ha-markdown";
import type { DataEntryFlowStepForm } from "../../data/data_entry_flow";
import type { HomeAssistant } from "../../types";
import type { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-form")
class StepFlowForm extends LitElement {
  @property({ attribute: false }) public flowConfig!: FlowConfig;

  @property({ attribute: false }) public step!: DataEntryFlowStepForm;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _loading = false;

  @state() private _stepData?: Record<string, any>;

  @state() private _errorMsg?: string;

  protected render(): TemplateResult {
    const step = this.step;
    const stepData = this._stepDataProcessed;

    return html`
      <h2>${this.flowConfig.renderShowFormStepHeader(this.hass, this.step)}</h2>
      <div class="content">
        ${this.flowConfig.renderShowFormStepDescription(this.hass, this.step)}
        ${this._errorMsg
          ? html`<ha-alert alert-type="error">${this._errorMsg}</ha-alert>`
          : ""}
        <ha-form
          .hass=${this.hass}
          .data=${stepData}
          .disabled=${this._loading}
          @value-changed=${this._stepDataChanged}
          .schema=${step.data_schema}
          .error=${step.errors}
          .computeLabel=${this._labelCallback}
          .computeHelper=${this._helperCallback}
          .computeError=${this._errorCallback}
        ></ha-form>
      </div>
      <div class="buttons">
        ${this._loading
          ? html`
              <div class="submit-spinner">
                <ha-circular-progress active></ha-circular-progress>
              </div>
            `
          : html`
              <div>
                <mwc-button @click=${this._submitStep}>
                  ${this.hass.localize(
                    `ui.panel.config.integrations.config_flow.${
                      this.step.last_step === false ? "next" : "submit"
                    }`
                  )}
                </mwc-button>
              </div>
            `}
      </div>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    setTimeout(() => this.shadowRoot!.querySelector("ha-form")!.focus(), 0);
    this.addEventListener("keypress", (ev) => {
      if (ev.keyCode === 13) {
        this._submitStep();
      }
    });
  }

  private get _stepDataProcessed() {
    if (this._stepData !== undefined) {
      return this._stepData;
    }

    this._stepData = computeInitialHaFormData(this.step.data_schema);
    return this._stepData;
  }

  private async _submitStep(): Promise<void> {
    const stepData = this._stepData || {};

    const allRequiredInfoFilledIn =
      stepData === undefined
        ? // If no data filled in, just check that any field is required
          this.step.data_schema.find((field) => field.required) === undefined
        : // If data is filled in, make sure all required fields are
          stepData &&
          this.step.data_schema.every(
            (field) =>
              !field.required ||
              !["", undefined].includes(stepData![field.name])
          );

    if (!allRequiredInfoFilledIn) {
      this._errorMsg = this.hass.localize(
        "ui.panel.config.integrations.config_flow.not_all_required_fields"
      );
      return;
    }

    this._loading = true;
    this._errorMsg = undefined;

    const flowId = this.step.flow_id;

    const toSendData = {};
    Object.keys(stepData).forEach((key) => {
      const value = stepData[key];
      const isEmpty = [undefined, ""].includes(value);

      if (!isEmpty) {
        toSendData[key] = value;
      }
    });

    try {
      const step = await this.flowConfig.handleFlowStep(
        this.hass,
        this.step.flow_id,
        toSendData
      );

      // make sure we're still showing the same step as when we
      // fired off request.
      if (!this.step || flowId !== this.step.flow_id) {
        return;
      }

      fireEvent(this, "flow-update", {
        step,
      });
    } catch (err: any) {
      this._errorMsg =
        (err && err.body && err.body.message) || "Unknown error occurred";
    } finally {
      this._loading = false;
    }
  }

  private _stepDataChanged(ev: CustomEvent): void {
    this._stepData = ev.detail.value;
  }

  private _labelCallback = (field: HaFormSchema): string =>
    this.flowConfig.renderShowFormStepFieldLabel(this.hass, this.step, field);

  private _helperCallback = (field: HaFormSchema): string | TemplateResult =>
    this.flowConfig.renderShowFormStepFieldHelper(this.hass, this.step, field);

  private _errorCallback = (error: string) =>
    this.flowConfig.renderShowFormStepFieldError(this.hass, this.step, error);

  static get styles(): CSSResultGroup {
    return [
      configFlowContentStyles,
      css`
        .error {
          color: red;
        }

        .submit-spinner {
          margin-right: 16px;
        }

        ha-alert,
        ha-form {
          margin-top: 24px;
          display: block;
        }
        h2 {
          word-break: break-word;
          padding-inline-end: 72px;
          direction: var(--direction);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-form": StepFlowForm;
  }
}
