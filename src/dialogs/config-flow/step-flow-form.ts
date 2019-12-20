import {
  LitElement,
  TemplateResult,
  html,
  CSSResultArray,
  css,
  customElement,
  property,
  PropertyValues,
} from "lit-element";
import "@material/mwc-button";
import "@polymer/paper-tooltip/paper-tooltip";
import "@polymer/paper-spinner/paper-spinner";

import "../../components/ha-form/ha-form";
import "../../components/ha-markdown";
import "../../resources/ha-style";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { configFlowContentStyles } from "./styles";
import { DataEntryFlowStepForm, FieldSchema } from "../../data/data_entry_flow";
import { FlowConfig } from "./show-dialog-data-entry-flow";

@customElement("step-flow-form")
class StepFlowForm extends LitElement {
  public flowConfig!: FlowConfig;

  @property()
  public step!: DataEntryFlowStepForm;

  @property()
  public hass!: HomeAssistant;

  @property()
  private _loading = false;

  @property()
  private _stepData?: { [key: string]: any };

  @property()
  private _errorMsg?: string;

  protected render(): TemplateResult | void {
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
      <h2>
        ${this.flowConfig.renderShowFormStepHeader(this.hass, this.step)}
      </h2>
      <div class="content">
        ${this._errorMsg
          ? html`
              <div class="error">${this._errorMsg}</div>
            `
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
                <paper-spinner active></paper-spinner>
              </div>
            `
          : html`
              <div>
                <mwc-button
                  @click=${this._submitStep}
                  .disabled=${!allRequiredInfoFilledIn}
                  >${this.hass.localize(
                    "ui.panel.config.integrations.config_flow.submit"
                  )}
                </mwc-button>

                ${!allRequiredInfoFilledIn
                  ? html`
                      <paper-tooltip position="left"
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
      if ("default" in field) {
        data[field.name] = field.default;
      }
    });
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

  private _labelCallback = (field: FieldSchema): string =>
    this.flowConfig.renderShowFormStepFieldLabel(this.hass, this.step, field);

  private _errorCallback = (error: string) =>
    this.flowConfig.renderShowFormStepFieldError(this.hass, this.step, error);

  static get styles(): CSSResultArray {
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
