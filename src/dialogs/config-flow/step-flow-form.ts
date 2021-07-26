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
import "../../components/ha-circular-progress";
import "../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../components/ha-form/ha-form";
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

    const allRequiredInfoFilledIn =
      stepData === undefined
        ? // If no data filled in, just check that any field is required
          step.data_schema.find((field) => !field.optional) === undefined
        : // If data is filled in, make sure all required fields are
          stepData &&
          step.data_schema.every(
            (field) =>
              field.optional || !["", undefined].includes(stepData![field.name])
          );

    return html`
      <h2>${this.flowConfig.renderShowFormStepHeader(this.hass, this.step)}</h2>
      <div class="content">
        ${this._errorMsg
          ? html` <div class="error">${this._errorMsg}</div> `
          : ""}
        ${this.flowConfig.renderShowFormStepDescription(this.hass, this.step)}
        <ha-form
          .data=${stepData}
          @value-changed=${this._stepDataChanged}
          .schema=${step.data_schema}
          .error=${step.errors}
          .computeLabel=${this._labelCallback}
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
                <mwc-button
                  @click=${this._submitStep}
                  .disabled=${!allRequiredInfoFilledIn}
                  >${this.hass.localize(
                    `ui.panel.config.integrations.config_flow.${
                      this.step.last_step === false ? "next" : "submit"
                    }`
                  )}
                </mwc-button>

                ${!allRequiredInfoFilledIn
                  ? html`
                      <paper-tooltip animation-delay="0" position="left"
                        >${this.hass.localize(
                          "ui.panel.config.integrations.config_flow.not_all_required_fields"
                        )}
                      </paper-tooltip>
                    `
                  : html``}
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

    const data = {};
    this.step.data_schema.forEach((field) => {
      if (field.description?.suggested_value) {
        data[field.name] = field.description.suggested_value;
      } else if ("default" in field) {
        data[field.name] = field.default;
      }
    });

    this._stepData = data;
    return data;
  }

  private async _submitStep(): Promise<void> {
    this._loading = true;
    this._errorMsg = undefined;

    const flowId = this.step.flow_id;
    const stepData = this._stepData || {};

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
    } catch (err) {
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "step-flow-form": StepFlowForm;
  }
}
