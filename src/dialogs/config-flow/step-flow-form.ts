import "@material/mwc-button";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../common/dom/fire_event";
import { isNavigationClick } from "../../common/dom/is-navigation-click";
import "../../components/ha-alert";
import { computeInitialHaFormData } from "../../components/ha-form/compute-initial-ha-form-data";
import "../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  HaFormSelector,
} from "../../components/ha-form/types";
import "../../components/ha-markdown";
import "../../components/ha-spinner";
import { autocompleteLoginFields } from "../../data/auth";
import type { DataEntryFlowStepForm } from "../../data/data_entry_flow";
import { previewModule } from "../../data/preview";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import type { FlowConfig } from "./show-dialog-data-entry-flow";
import { configFlowContentStyles } from "./styles";

@customElement("step-flow-form")
class StepFlowForm extends LitElement {
  @property({ attribute: false }) public flowConfig!: FlowConfig;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public step!: DataEntryFlowStepForm;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _loading = false;

  @state() private _stepData?: Record<string, any>;

  @state() private _errorMsg?: string;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._handleKeyDown);
  }

  private handleReadOnlyFields = memoizeOne((schema) =>
    schema?.map((field) => ({
      ...field,
      ...(Object.values((field as HaFormSelector)?.selector ?? {})[0]?.read_only
        ? { disabled: true }
        : {}),
    }))
  );

  protected render(): TemplateResult {
    const step = this.step;
    const stepData = this._stepDataProcessed;

    return html`
      <div class="content" @click=${this._clickHandler}>
        ${this.flowConfig.renderShowFormStepDescription(this.hass, this.step)}
        ${this._errorMsg
          ? html`<ha-alert alert-type="error">${this._errorMsg}</ha-alert>`
          : ""}
        <ha-form
          .hass=${this.hass}
          .narrow=${this.narrow}
          .data=${stepData}
          .disabled=${this._loading}
          @value-changed=${this._stepDataChanged}
          .schema=${autocompleteLoginFields(
            this.handleReadOnlyFields(step.data_schema)
          )}
          .error=${step.errors}
          .computeLabel=${this._labelCallback}
          .computeHelper=${this._helperCallback}
          .computeError=${this._errorCallback}
          .localizeValue=${this._localizeValueCallback}
        ></ha-form>
      </div>
      ${step.preview
        ? html`<div class="preview" @set-flow-errors=${this._setError}>
            <h3>
              ${this.hass.localize(
                "ui.panel.config.integrations.config_flow.preview"
              )}:
            </h3>
            ${dynamicElement(`flow-preview-${previewModule(step.preview)}`, {
              hass: this.hass,
              domain: step.preview,
              flowType: this.flowConfig.flowType,
              handler: step.handler,
              stepId: step.step_id,
              flowId: step.flow_id,
              stepData,
            })}
          </div>`
        : nothing}
      <div class="buttons">
        ${this._loading
          ? html`
              <div class="submit-spinner">
                <ha-spinner size="small"></ha-spinner>
              </div>
            `
          : html`
              <div>
                <mwc-button @click=${this._submitStep}>
                  ${this.flowConfig.renderShowFormStepSubmitButton(
                    this.hass,
                    this.step
                  )}
                </mwc-button>
              </div>
            `}
      </div>
    `;
  }

  private _setError(ev: CustomEvent) {
    this.step = { ...this.step, errors: ev.detail };
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    setTimeout(() => this.shadowRoot!.querySelector("ha-form")!.focus(), 0);
    this.addEventListener("keydown", this._handleKeyDown);
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (changedProps.has("step") && this.step?.preview) {
      import(`./previews/flow-preview-${previewModule(this.step.preview)}`);
    }
  }

  private _clickHandler(ev: MouseEvent) {
    if (isNavigationClick(ev, false)) {
      fireEvent(this, "flow-update", {
        step: undefined,
      });
    }
  }

  private _handleKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === "Enter") {
      this._submitStep();
    }
  };

  private get _stepDataProcessed() {
    if (this._stepData !== undefined) {
      return this._stepData;
    }

    this._stepData = computeInitialHaFormData(this.step.data_schema);
    return this._stepData;
  }

  private async _submitStep(): Promise<void> {
    const stepData = this._stepData || {};

    const checkAllRequiredFields = (
      schema: readonly HaFormSchema[],
      data: Record<string, any>
    ) =>
      schema.every(
        (field) =>
          (!field.required || !["", undefined].includes(data[field.name])) &&
          (field.type !== "expandable" ||
            (!field.required && data[field.name] === undefined) ||
            checkAllRequiredFields(field.schema, data[field.name]))
      );

    const allRequiredInfoFilledIn =
      stepData === undefined
        ? // If no data filled in, just check that any field is required
          this.step.data_schema.find((field) => field.required) === undefined
        : // If data is filled in, make sure all required fields are
          checkAllRequiredFields(this.step.data_schema, stepData);

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
      const field = this.step.data_schema?.find((f) => f.name === key);
      const selector = (field as HaFormSelector)?.selector ?? {};
      const read_only = (Object.values(selector)[0] as any)?.read_only;
      if (!isEmpty && !read_only) {
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
      if (err && err.body) {
        if (err.body.message) {
          this._errorMsg = err.body.message;
        }
        if (err.body.errors) {
          this.step = { ...this.step, errors: err.body.errors };
        }
        if (!err.body.message && !err.body.errors) {
          this._errorMsg = "Unknown error occurred";
        }
      } else {
        this._errorMsg = "Unknown error occurred";
      }
    } finally {
      this._loading = false;
    }
  }

  private _stepDataChanged(ev: CustomEvent): void {
    this._stepData = ev.detail.value;
  }

  private _labelCallback = (field: HaFormSchema, _data, options): string =>
    this.flowConfig.renderShowFormStepFieldLabel(
      this.hass,
      this.step,
      field,
      options
    );

  private _helperCallback = (
    field: HaFormSchema,
    options
  ): string | TemplateResult =>
    this.flowConfig.renderShowFormStepFieldHelper(
      this.hass,
      this.step,
      field,
      options
    );

  private _errorCallback = (error: string) =>
    this.flowConfig.renderShowFormStepFieldError(this.hass, this.step, error);

  private _localizeValueCallback = (key: string) =>
    this.flowConfig.renderShowFormStepFieldLocalizeValue(
      this.hass,
      this.step,
      key
    );

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      configFlowContentStyles,
      css`
        .error {
          color: red;
        }

        .submit-spinner {
          height: 36px;
          display: flex;
          align-items: center;
          margin-right: 16px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
        }

        ha-alert,
        ha-form {
          margin-top: 24px;
          display: block;
        }
      `,
    ];
  }
}

declare global {
  interface HASSDomEvents {
    "set-flow-errors": { errors: DataEntryFlowStepForm["errors"] };
  }
  interface HTMLElementTagNameMap {
    "step-flow-form": StepFlowForm;
  }
}
