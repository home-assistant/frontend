import "@material/mwc-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import { computeRTL } from "../../common/util/compute_rtl";
import "../../components/ha-circular-progress";
import "../../components/ha-dialog";
import "../../components/ha-form/ha-form";
import "../../components/ha-icon-button";
import "../../components/ha-markdown";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../data/area_registry";
import { fetchConfigFlowInProgress } from "../../data/config_flow";
import type {
  DataEntryFlowProgress,
  DataEntryFlowProgressedEvent,
  DataEntryFlowStep,
} from "../../data/data_entry_flow";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../data/device_registry";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { showAlertDialog } from "../generic/show-dialog-box";
import { DataEntryFlowDialogParams } from "./show-dialog-data-entry-flow";
import "./step-flow-abort";
import "./step-flow-create-entry";
import "./step-flow-external";
import "./step-flow-form";
import "./step-flow-loading";
import "./step-flow-pick-handler";
import "./step-flow-progress";
import "./step-flow-pick-flow";

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

  @internalProperty() private _params?: DataEntryFlowDialogParams;

  @internalProperty() private _loading = true;

  private _instance = instance;

  @internalProperty() private _step:
    | DataEntryFlowStep
    | undefined
    // Null means we need to pick a config flow
    | null;

  @internalProperty() private _devices?: DeviceRegistryEntry[];

  @internalProperty() private _areas?: AreaRegistryEntry[];

  @internalProperty() private _handlers?: string[];

  @internalProperty() private _handler?: string;

  @internalProperty() private _flowsInProgress?: DataEntryFlowProgress[];

  private _unsubAreas?: UnsubscribeFunc;

  private _unsubDevices?: UnsubscribeFunc;

  public async showDialog(params: DataEntryFlowDialogParams): Promise<void> {
    this._params = params;
    this._instance = instance++;

    if (params.startFlowHandler) {
      this._checkFlowsInProgress(params.startFlowHandler);
      return;
    }

    if (params.continueFlowId) {
      this._loading = true;
      const curInstance = this._instance;
      let step: DataEntryFlowStep;
      try {
        step = await params.flowConfig.fetchFlow(
          this.hass,
          params.continueFlowId
        );
      } catch (err) {
        this._step = undefined;
        this._params = undefined;
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.integrations.config_flow.error"
          ),
          text: this.hass.localize(
            "ui.panel.config.integrations.config_flow.could_not_load"
          ),
        });
        return;
      }

      // Happens if second showDialog called
      if (curInstance !== this._instance) {
        return;
      }

      this._processStep(step);
      this._loading = false;
      return;
    }

    // Create a new config flow. Show picker
    if (!params.flowConfig.getFlowHandlers) {
      throw new Error("No getFlowHandlers defined in flow config");
    }
    this._step = null;

    // We only load the handlers once
    if (this._handlers === undefined) {
      this._loading = true;
      try {
        this._handlers = await params.flowConfig.getFlowHandlers(this.hass);
      } finally {
        this._loading = false;
      }
    }
    await this.updateComplete;
  }

  public closeDialog() {
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

    if (this._step !== null && this._params.dialogClosedCallback) {
      this._params.dialogClosedCallback({
        flowFinished,
      });
    }

    this._step = undefined;
    this._params = undefined;
    this._devices = undefined;
    this._flowsInProgress = undefined;
    this._handler = undefined;
    if (this._unsubAreas) {
      this._unsubAreas();
      this._unsubAreas = undefined;
    }
    if (this._unsubDevices) {
      this._unsubDevices();
      this._unsubDevices = undefined;
    }
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        hideActions
      >
        <div>
          ${this._loading ||
          (this._step === null &&
            this._handlers === undefined &&
            this._handler === undefined)
            ? html`
                <step-flow-loading
                  .label=${this.hass.localize(
                    "ui.panel.config.integrations.config_flow.loading_first_time"
                  )}
                ></step-flow-loading>
              `
            : this._step === undefined
            ? // When we are going to next step, we render 1 round of empty
              // to reset the element.
              ""
            : html`
                <ha-icon-button
                  aria-label=${this.hass.localize(
                    "ui.panel.config.integrations.config_flow.dismiss"
                  )}
                  icon="hass:close"
                  dialogAction="close"
                  ?rtl=${computeRTL(this.hass)}
                ></ha-icon-button>
                ${this._step === null
                  ? this._handler
                    ? html`<step-flow-pick-flow
                        .flowConfig=${this._params.flowConfig}
                        .hass=${this.hass}
                        .handler=${this._handler}
                        .flowsInProgress=${this._flowsInProgress}
                      ></step-flow-pick-flow>`
                    : // Show handler picker
                      html`
                        <step-flow-pick-handler
                          .hass=${this.hass}
                          .handlers=${this._handlers}
                          .showAdvanced=${this._params.showAdvanced}
                          @handler-picked=${this._handlerPicked}
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
                  : this._step.type === "progress"
                  ? html`
                      <step-flow-progress
                        .flowConfig=${this._params.flowConfig}
                        .step=${this._step}
                        .hass=${this.hass}
                      ></step-flow-progress>
                    `
                  : this._devices === undefined || this._areas === undefined
                  ? // When it's a create entry result, we will fetch device & area registry
                    html` <step-flow-loading></step-flow-loading> `
                  : html`
                      <step-flow-create-entry
                        .flowConfig=${this._params.flowConfig}
                        .step=${this._step}
                        .hass=${this.hass}
                        .devices=${this._devices}
                        .areas=${this._areas}
                      ></step-flow-create-entry>
                    `}
              `}
        </div>
      </ha-dialog>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.hass.connection.subscribeEvents<DataEntryFlowProgressedEvent>(
      async (ev) => {
        if (ev.data.flow_id !== this._step?.flow_id) {
          return;
        }
        const step = await this._params!.flowConfig.fetchFlow(
          this.hass,
          this._step?.flow_id
        );
        this._processStep(step);
      },
      "data_entry_flow_progressed"
    );
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

  private async _checkFlowsInProgress(handler: string) {
    this._loading = true;

    const flowsInProgress = (
      await fetchConfigFlowInProgress(this.hass.connection)
    ).filter((flow) => flow.handler === handler);

    if (!flowsInProgress.length) {
      let step: DataEntryFlowStep;
      try {
        step = await this._params!.flowConfig.createFlow(this.hass, handler);
      } catch (err) {
        this._step = undefined;
        this._params = undefined;
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.integrations.config_flow.error"
          ),
          text: this.hass.localize(
            "ui.panel.config.integrations.config_flow.could_not_load"
          ),
        });
        return;
      }
      this._processStep(step);
    } else {
      this._step = null;
      this._handler = handler;
      this._flowsInProgress = flowsInProgress;
    }
    this._loading = false;
  }

  private _handlerPicked(ev) {
    this._checkFlowsInProgress(ev.detail.handler);
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
      this.closeDialog();
      return;
    }
    this._step = undefined;
    await this.updateComplete;
    this._step = step;
  }

  static get styles(): CSSResultArray {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
        }
        ha-icon-button {
          padding: 16px;
          position: absolute;
          top: 0;
          right: 0;
        }
        ha-icon-button[rtl] {
          right: auto;
          left: 0;
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
