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
import { UnsubscribeFunc } from "home-assistant-js-websocket";

import "../../components/ha-form/ha-form";
import "../../components/ha-markdown";
import "../../resources/ha-style";
import "../../components/dialog/ha-paper-dialog";
// Not duplicate, is for typing
// tslint:disable-next-line
import { HaPaperDialog } from "../../components/dialog/ha-paper-dialog";
import { haStyleDialog } from "../../resources/styles";
import { PolymerChangedEvent } from "../../polymer-types";
import { DataEntryFlowDialogParams } from "./show-dialog-data-entry-flow";

import "./step-flow-pick-handler";
import "./step-flow-loading";
import "./step-flow-form";
import "./step-flow-external";
import "./step-flow-abort";
import "./step-flow-create-entry";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../data/device_registry";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../data/area_registry";
import { HomeAssistant } from "../../types";
import { DataEntryFlowStep } from "../../data/data_entry_flow";

let instance = 0;

declare global {
  // for fire event
  interface HASSDomEvents {
    "flow-update": {
      step?: DataEntryFlowStep;
      stepPromise?: Promise<DataEntryFlowStep>;
    };
  }
}

@customElement("dialog-data-entry-flow")
class DataEntryFlowDialog extends LitElement {
  public hass!: HomeAssistant;
  @property() private _params?: DataEntryFlowDialogParams;
  @property() private _loading = true;
  private _instance = instance;
  @property() private _step:
    | DataEntryFlowStep
    | undefined
    // Null means we need to pick a config flow
    | null;
  @property() private _devices?: DeviceRegistryEntry[];
  @property() private _areas?: AreaRegistryEntry[];
  @property() private _handlers?: string[];
  private _unsubAreas?: UnsubscribeFunc;
  private _unsubDevices?: UnsubscribeFunc;

  public async showDialog(params: DataEntryFlowDialogParams): Promise<void> {
    this._params = params;
    this._instance = instance++;

    // Create a new config flow. Show picker
    if (!params.continueFlowId && !params.startFlowHandler) {
      if (!params.flowConfig.getFlowHandlers) {
        throw new Error("No getFlowHandlers defined in flow config");
      }
      this._step = null;

      // We only load the handlers once
      if (this._handlers === undefined) {
        this._loading = true;
        this.updateComplete.then(() => this._scheduleCenterDialog());
        try {
          this._handlers = await params.flowConfig.getFlowHandlers(this.hass);
        } finally {
          this._loading = false;
        }
      }
      await this.updateComplete;
      this._scheduleCenterDialog();
      return;
    }

    this._loading = true;
    const curInstance = this._instance;
    const step = await (params.continueFlowId
      ? params.flowConfig.fetchFlow(this.hass, params.continueFlowId)
      : params.flowConfig.createFlow(this.hass, params.startFlowHandler!));

    // Happens if second showDialog called
    if (curInstance !== this._instance) {
      return;
    }

    this._processStep(step);
    this._loading = false;
    // When the flow changes, center the dialog.
    // Don't do it on each step or else the dialog keeps bouncing.
    this._scheduleCenterDialog();
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-paper-dialog
        with-backdrop
        opened
        @opened-changed=${this._openedChanged}
      >
        ${this._loading || (this._step === null && this._handlers === undefined)
          ? html`
              <step-flow-loading></step-flow-loading>
            `
          : this._step === undefined
          ? // When we are going to next step, we render 1 round of empty
            // to reset the element.
            ""
          : this._step === null
          ? // Show handler picker
            html`
              <step-flow-pick-handler
                .flowConfig=${this._params.flowConfig}
                .hass=${this.hass}
                .handlers=${this._handlers}
              ></step-flow-pick-handler>
            `
          : this._step.type === "form"
          ? html`
              <step-flow-form
                .flowConfig=${this._params.flowConfig}
                .step=${this._step}
                .hass=${this.hass}
              ></step-flow-form>
            `
          : this._step.type === "external"
          ? html`
              <step-flow-external
                .flowConfig=${this._params.flowConfig}
                .step=${this._step}
                .hass=${this.hass}
              ></step-flow-external>
            `
          : this._step.type === "abort"
          ? html`
              <step-flow-abort
                .flowConfig=${this._params.flowConfig}
                .step=${this._step}
                .hass=${this.hass}
              ></step-flow-abort>
            `
          : this._devices === undefined || this._areas === undefined
          ? // When it's a create entry result, we will fetch device & area registry
            html`
              <step-flow-loading></step-flow-loading>
            `
          : html`
              <step-flow-create-entry
                .flowConfig=${this._params.flowConfig}
                .step=${this._step}
                .hass=${this.hass}
                .devices=${this._devices}
                .areas=${this._areas}
              ></step-flow-create-entry>
            `}
      </ha-paper-dialog>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.addEventListener("flow-update", (ev) => {
      const { step, stepPromise } = (ev as any).detail;
      this._processStep(step || stepPromise);
    });
  }

  protected updated(changedProps: PropertyValues) {
    if (
      changedProps.has("_step") &&
      this._step &&
      this._step.type === "create_entry"
    ) {
      if (this._params!.flowConfig.loadDevicesAndAreas) {
        this._fetchDevices(this._step.result);
        this._fetchAreas();
      } else {
        this._devices = [];
        this._areas = [];
      }
    }

    if (changedProps.has("_devices") && this._dialog) {
      this._scheduleCenterDialog();
    }
  }

  private _scheduleCenterDialog() {
    setTimeout(() => this._dialog.center(), 0);
  }

  private get _dialog(): HaPaperDialog {
    return this.shadowRoot!.querySelector("ha-paper-dialog")!;
  }

  private async _fetchDevices(configEntryId) {
    this._unsubDevices = subscribeDeviceRegistry(
      this.hass.connection,
      (devices) => {
        this._devices = devices.filter((device) =>
          device.config_entries.includes(configEntryId)
        );
      }
    );
  }

  private async _fetchAreas() {
    this._unsubAreas = subscribeAreaRegistry(this.hass.connection, (areas) => {
      this._areas = areas;
    });
  }

  private async _processStep(
    step: DataEntryFlowStep | undefined | Promise<DataEntryFlowStep>
  ): Promise<void> {
    if (step instanceof Promise) {
      this._loading = true;
      try {
        this._step = await step;
      } finally {
        this._loading = false;
      }
      return;
    }

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
      this._step && ["create_entry", "abort"].includes(this._step.type)
    );

    // If we created this flow, delete it now.
    if (this._step && !flowFinished && !this._params.continueFlowId) {
      this._params.flowConfig.deleteFlow(this.hass, this._step.flow_id);
    }

    if (this._params.dialogClosedCallback) {
      this._params.dialogClosedCallback({
        flowFinished,
      });
    }

    this._step = undefined;
    this._params = undefined;
    this._devices = undefined;
    if (this._unsubAreas) {
      this._unsubAreas();
      this._unsubAreas = undefined;
    }
    if (this._unsubDevices) {
      this._unsubDevices();
      this._unsubDevices = undefined;
    }
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    // Closed dialog by clicking on the overlay
    if (!ev.detail.value) {
      if (this._step) {
        this._flowDone();
      } else if (this._step === null) {
        // Flow aborted during picking flow
        this._step = undefined;
        this._params = undefined;
      }
    }
  }

  static get styles(): CSSResultArray {
    return [
      haStyleDialog,
      css`
        ha-paper-dialog {
          max-width: 500px;
        }
        ha-paper-dialog > * {
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
    "dialog-data-entry-flow": DataEntryFlowDialog;
  }
}
