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
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-tooltip/paper-tooltip";
import "@polymer/paper-spinner/paper-spinner";
import "@polymer/paper-dialog/paper-dialog";
// Not duplicate, is for typing
// tslint:disable-next-line
import { PaperDialogElement } from "@polymer/paper-dialog/paper-dialog";

import "../../components/ha-form";
import "../../components/ha-markdown";
import "../../resources/ha-style";
import { haStyleDialog } from "../../resources/styles";
import {
  fetchConfigFlow,
  createConfigFlow,
  ConfigFlowStep,
  deleteConfigFlow,
} from "../../data/config_entries";
import { PolymerChangedEvent } from "../../polymer-types";
import { HaConfigFlowParams } from "./show-dialog-config-flow";

import "./step-flow-loading";
import "./step-flow-form";
import "./step-flow-abort";
import "./step-flow-create-entry";

let instance = 0;

declare global {
  // for fire event
  interface HASSDomEvents {
    "flow-update": {
      step?: ConfigFlowStep;
    };
  }
}

@customElement("dialog-config-flow")
class ConfigFlowDialog extends LitElement {
  @property()
  private _params?: HaConfigFlowParams;

  @property()
  private _loading = true;

  private _instance = instance;

  @property()
  private _step?: ConfigFlowStep;

  public async showDialog(params: HaConfigFlowParams): Promise<void> {
    this._params = params;
    this._loading = true;
    this._instance = instance++;
    this._step = undefined;

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

    return html`
      <paper-dialog with-backdrop opened @opened-changed=${this._openedChanged}>
        ${this._loading
          ? html`
              <step-flow-loading></step-flow-loading>
            `
          : this._step === undefined
          ? // When we are going to next step, we render 1 round of empty
            // to reset the element.
            ""
          : this._step.type === "form"
          ? html`
              <step-flow-form
                .step=${this._step}
                .hass=${this._params.hass}
              ></step-flow-form>
            `
          : this._step.type === "abort"
          ? html`
              <step-flow-abort
                .step=${this._step}
                .hass=${this._params.hass}
              ></step-flow-abort>
            `
          : html`
              <step-flow-create-entry
                .step=${this._step}
                .hass=${this._params.hass}
              ></step-flow-create-entry>
            `}
      </paper-dialog>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.addEventListener("flow-update", (ev) => {
      this._processStep((ev as any).detail.step);
    });
  }

  private get _dialog(): PaperDialogElement {
    return this.shadowRoot!.querySelector("paper-dialog")!;
  }

  private async _processStep(step: ConfigFlowStep): Promise<void> {
    if (step === undefined) {
      this._flowDone();
      return;
    }
    this._step = undefined;
    await this.updateComplete;
    this._step = step;
  }

  private _flowDone(): void {
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

    this._step = undefined;
    this._params = undefined;
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    // Closed dialog by clicking on the overlay
    if (this._step && !ev.detail.value) {
      this._flowDone();
    }
  }

  static get styles(): CSSResultArray {
    return [
      haStyleDialog,
      css`
        paper-dialog {
          max-width: 500px;
        }
        paper-dialog > * {
          margin: 0;
          display: block;
          padding: 0;
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
