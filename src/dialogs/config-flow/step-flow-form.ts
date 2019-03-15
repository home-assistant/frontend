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

import "../../components/ha-form";
import "../../components/ha-markdown";
import "../../resources/ha-style";
import {
  handleConfigFlowStep,
  FieldSchema,
  ConfigFlowStepForm,
} from "../../data/config_entries";
import { PolymerChangedEvent, applyPolymerEvent } from "../../polymer-types";
import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import { localizeKey } from "../../common/translations/localize";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-form")
class StepFlowForm extends LitElement {
  @property()
  public step!: ConfigFlowStepForm;

  @property()
  public hass!: HomeAssistant;

  @property()
  private _loading = false;

  @property()
  private _stepData?: { [key: string]: any };

  @property()
  private _errorMsg?: string;

  protected render(): TemplateResult | void {
    const localize = this.hass.localize;
    const step = this.step;

    const allRequiredInfoFilledIn =
      this._stepData === undefined
        ? // If no data filled in, just check that any field is required
          step.data_schema.find((field) => !field.optional) === undefined
        : // If data is filled in, make sure all required fields are
          this._stepData &&
          step.data_schema.every(
            (field) =>
              field.optional ||
              !["", undefined].includes(this._stepData![field.name])
          );

    const description = localizeKey(
      localize,
      `component.${step.handler}.config.step.${step.step_id}.description`,
      step.description_placeholders
    );

    return html`
      <h2>
        ${localize(
          `component.${step.handler}.config.step.${step.step_id}.title`
        )}
      </h2>
      <div class="content">
        ${this._errorMsg
          ? html`
              <div class="error">${this._errorMsg}</div>
            `
          : ""}
        ${description
          ? html`
              <ha-markdown .content=${description} allow-svg></ha-markdown>
            `
          : ""}
        <ha-form
          .data=${this._stepDataProcessed}
          @data-changed=${this._stepDataChanged}
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
                >
                  Submit
                </mwc-button>

                ${!allRequiredInfoFilledIn
                  ? html`
                      <paper-tooltip position="left">
                        Not all required fields are filled in.
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
      const step = await handleConfigFlowStep(
        this.hass,
        this.step.flow_id,
        toSendData
      );

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

  private _stepDataChanged(ev: PolymerChangedEvent<any>): void {
    this._stepData = applyPolymerEvent(ev, this._stepData);
  }

  private _labelCallback = (schema: FieldSchema): string => {
    const step = this.step as ConfigFlowStepForm;

    return this.hass.localize(
      `component.${step.handler}.config.step.${step.step_id}.data.${
        schema.name
      }`
    );
  };

  private _errorCallback = (error: string) =>
    this.hass.localize(`component.${this.step.handler}.config.error.${error}`);

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
