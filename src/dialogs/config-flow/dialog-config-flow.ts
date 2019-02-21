import {
  LitElement,
  TemplateResult,
  html,
  CSSResultArray,
  css,
  customElement,
  property,
} from "lit-element";
import "@material/mwc-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-tooltip/paper-tooltip";
import "@polymer/paper-spinner/paper-spinner";

import "../../components/ha-form";
import "../../components/ha-markdown";
import "../../resources/ha-style";
import { haStyleDialog } from "../../resources/styles";
import {
  fetchConfigFlow,
  createConfigFlow,
  ConfigFlowStep,
  handleConfigFlowStep,
  deleteConfigFlow,
  FieldSchema,
  ConfigFlowStepForm,
} from "../../data/config_entries";
// Not duplicate, is for typing
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";
import { PolymerChangedEvent, applyPolymerEvent } from "../../polymer-types";
import { HaConfigFlowParams } from "./show-dialog-config-flow";

let instance = 0;

@customElement("dialog-config-flow")
class ConfigFlowDialog extends LitElement {
  @property()
  private _params?: HaConfigFlowParams;

  @property()
  private _loading = true;

  private _instance = instance;

  @property()
  private _step?: ConfigFlowStep;

  @property()
  private _stepData?: { [key: string]: any };

  @property()
  private _errorMsg?: string;

  public async showDialog(params: HaConfigFlowParams): Promise<void> {
    this._params = params;
    this._loading = true;
    this._instance = instance++;
    this._step = undefined;
    this._stepData = {};
    this._errorMsg = undefined;

    const fetchStep = params.continueFlowId
      ? fetchConfigFlow(params.hass, params.continueFlowId)
      : params.newFlowForHandler
      ? createConfigFlow(params.hass, params.newFlowForHandler)
      : undefined;

    if (!fetchStep) {
      throw new Error(`Pass in either continueFlowId or newFlorForHandler`);
    }

    const curInstance = this._instance;

    await this.updateComplete;
    const step = await fetchStep;

    // Happens if second showDialog called
    if (curInstance !== this._instance) {
      return;
    }

    this._processStep(step);
    this._loading = false;
    // When the flow changes, center the dialog.
    // Don't do it on each step or else the dialog keeps bouncing.
    setTimeout(() => this._dialog.center(), 0);
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }
    const localize = this._params.hass.localize;

    const step = this._step;
    let headerContent: string | undefined;
    let bodyContent: TemplateResult | undefined;
    let buttonContent: TemplateResult | undefined;
    let descriptionKey: string | undefined;

    if (!step) {
      bodyContent = html`
        <div class="init-spinner">
          <paper-spinner active></paper-spinner>
        </div>
      `;
    } else if (step.type === "abort") {
      descriptionKey = `component.${step.handler}.config.abort.${step.reason}`;
      headerContent = "Aborted";
      bodyContent = html``;
      buttonContent = html`
        <mwc-button @click="${this._flowDone}">Close</mwc-button>
      `;
    } else if (step.type === "create_entry") {
      descriptionKey = `component.${
        step.handler
      }.config.create_entry.${step.description || "default"}`;
      headerContent = "Success!";
      bodyContent = html`
        <p>Created config for ${step.title}</p>
      `;
      buttonContent = html`
        <mwc-button @click="${this._flowDone}">Close</mwc-button>
      `;
    } else {
      // form
      descriptionKey = `component.${step.handler}.config.step.${
        step.step_id
      }.description`;
      headerContent = localize(
        `component.${step.handler}.config.step.${step.step_id}.title`
      );
      bodyContent = html`
        <ha-form
          .data=${this._stepData}
          @data-changed=${this._stepDataChanged}
          .schema=${step.data_schema}
          .error=${step.errors}
          .computeLabel=${this._labelCallback}
          .computeError=${this._errorCallback}
        ></ha-form>
      `;

      const allRequiredInfoFilledIn =
        this._stepData &&
        step.data_schema.every(
          (field) =>
            field.optional ||
            !["", undefined].includes(this._stepData![field.name])
        );

      buttonContent = this._loading
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
          `;
    }

    let description: string | undefined;

    if (step && descriptionKey) {
      const args: [string, ...string[]] = [descriptionKey];
      const placeholders = step.description_placeholders || {};
      Object.keys(placeholders).forEach((key) => {
        args.push(key);
        args.push(placeholders[key]);
      });
      description = localize(...args);
    }

    return html`
      <paper-dialog
        with-backdrop
        .opened=${true}
        @opened-changed=${this._openedChanged}
      >
        <h2>
          ${headerContent}
        </h2>
        <paper-dialog-scrollable>
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
          ${bodyContent}
        </paper-dialog-scrollable>
        <div class="buttons">
          ${buttonContent}
        </div>
      </paper-dialog>
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

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  private async _submitStep() {
    this._loading = true;
    this._errorMsg = undefined;

    const curInstance = this._instance;
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
        this._params!.hass,
        this._step!.flow_id,
        toSendData
      );

      if (curInstance !== this._instance) {
        return;
      }

      this._processStep(step);
    } catch (err) {
      this._errorMsg =
        (err && err.body && err.body.message) || "Unknown error occurred";
    } finally {
      this._loading = false;
    }
  }

  private _processStep(step: ConfigFlowStep) {
    this._step = step;

    // We got a new form if there are no errors.
    if (step.type === "form") {
      if (!step.errors) {
        step.errors = {};
      }

      if (Object.keys(step.errors).length === 0) {
        const data = {};
        step.data_schema.forEach((field) => {
          if ("default" in field) {
            data[field.name] = field.default;
          }
        });
        this._stepData = data;
      }
    }
  }

  private _flowDone() {
    if (!this._params) {
      return;
    }
    const flowFinished = Boolean(
      this._step && ["success", "abort"].includes(this._step.type)
    );

    // If we created this flow, delete it now.
    if (this._step && !flowFinished && this._params.newFlowForHandler) {
      deleteConfigFlow(this._params.hass, this._step.flow_id);
    }

    this._params.dialogClosedCallback({
      flowFinished,
    });

    this._errorMsg = undefined;
    this._step = undefined;
    this._stepData = {};
    this._params = undefined;
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    // Closed dialog by clicking on the overlay
    if (this._step && !ev.detail.value) {
      this._flowDone();
    }
  }

  private _stepDataChanged(ev: PolymerChangedEvent<any>) {
    this._stepData = applyPolymerEvent(ev, this._stepData);
  }

  private _labelCallback = (schema: FieldSchema) => {
    const step = this._step as ConfigFlowStepForm;

    return this._params!.hass.localize(
      `component.${step.handler}.config.step.${step.step_id}.data.${
        schema.name
      }`
    );
  };

  private _errorCallback = (error: string) =>
    this._params!.hass.localize(
      `component.${this._step!.handler}.config.error.${error}`
    );

  static get styles(): CSSResultArray {
    return [
      haStyleDialog,
      css`
        .error {
          color: red;
        }
        paper-dialog {
          max-width: 500px;
        }
        ha-markdown {
          word-break: break-word;
        }
        ha-markdown a {
          color: var(--primary-color);
        }
        ha-markdown img:first-child:last-child {
          display: block;
          margin: 0 auto;
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
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-config-flow": ConfigFlowDialog;
  }
}
