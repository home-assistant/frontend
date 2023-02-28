import "@material/mwc-button";
import { mdiClose, mdiHelpCircle } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, state } from "lit/decorators";
import { fireEvent, HASSDomEvent } from "../../common/dom/fire_event";
import "../../components/ha-circular-progress";
import "../../components/ha-dialog";
import "../../components/ha-icon-button";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../data/area_registry";
import {
  DataEntryFlowStep,
  subscribeDataEntryFlowProgressed,
} from "../../data/data_entry_flow";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../data/device_registry";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import { showAlertDialog } from "../generic/show-dialog-box";
import {
  DataEntryFlowDialogParams,
  LoadingReason,
} from "./show-dialog-data-entry-flow";
import "./step-flow-abort";
import "./step-flow-create-entry";
import "./step-flow-external";
import "./step-flow-form";
import "./step-flow-loading";
import "./step-flow-menu";
import "./step-flow-progress";

let instance = 0;

interface FlowUpdateEvent {
  step?: DataEntryFlowStep;
  stepPromise?: Promise<DataEntryFlowStep>;
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "flow-update": FlowUpdateEvent;
  }
  // for add event listener
  interface HTMLElementEventMap {
    "flow-update": HASSDomEvent<FlowUpdateEvent>;
  }
}

@customElement("dialog-data-entry-flow")
class DataEntryFlowDialog extends LitElement {
  public hass!: HomeAssistant;

  @state() private _params?: DataEntryFlowDialogParams;

  @state() private _loading?: LoadingReason;

  private _instance = instance;

  @state() private _step:
    | DataEntryFlowStep
    | undefined
    // Null means we need to pick a config flow
    | null;

  @state() private _devices?: DeviceRegistryEntry[];

  @state() private _areas?: AreaRegistryEntry[];

  @state() private _handler?: string;

  private _unsubAreas?: UnsubscribeFunc;

  private _unsubDevices?: UnsubscribeFunc;

  private _unsubDataEntryFlowProgressed?: Promise<UnsubscribeFunc>;

  public async showDialog(params: DataEntryFlowDialogParams): Promise<void> {
    this._params = params;
    this._instance = instance++;

    const curInstance = this._instance;
    let step: DataEntryFlowStep;

    if (params.startFlowHandler) {
      this._loading = "loading_flow";
      this._handler = params.startFlowHandler;
      try {
        step = await this._params!.flowConfig.createFlow(
          this.hass,
          params.startFlowHandler
        );
      } catch (err: any) {
        this.closeDialog();
        let message = err.message || err.body || "Unknown error";
        if (typeof message !== "string") {
          message = JSON.stringify(message);
        }
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.integrations.config_flow.error"
          ),
          text: `${this.hass.localize(
            "ui.panel.config.integrations.config_flow.could_not_load"
          )}: ${message}`,
        });
        return;
      }
      // Happens if second showDialog called
      if (curInstance !== this._instance) {
        return;
      }
    } else if (params.continueFlowId) {
      this._loading = "loading_flow";
      try {
        step = await params.flowConfig.fetchFlow(
          this.hass,
          params.continueFlowId
        );
      } catch (err: any) {
        this.closeDialog();
        let message = err.message || err.body || "Unknown error";
        if (typeof message !== "string") {
          message = JSON.stringify(message);
        }
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.integrations.config_flow.error"
          ),
          text: `${this.hass.localize(
            "ui.panel.config.integrations.config_flow.could_not_load"
          )}: ${message}`,
        });
        return;
      }
    } else {
      return;
    }

    // Happens if second showDialog called
    if (curInstance !== this._instance) {
      return;
    }

    this._processStep(step);
    this._loading = undefined;
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

    if (this._step && this._params.dialogClosedCallback) {
      this._params.dialogClosedCallback({
        flowFinished,
        entryId:
          "result" in this._step ? this._step.result?.entry_id : undefined,
      });
    }

    this._loading = undefined;
    this._step = undefined;
    this._params = undefined;
    this._devices = undefined;
    this._handler = undefined;
    if (this._unsubAreas) {
      this._unsubAreas();
      this._unsubAreas = undefined;
    }
    if (this._unsubDevices) {
      this._unsubDevices();
      this._unsubDevices = undefined;
    }
    if (this._unsubDataEntryFlowProgressed) {
      this._unsubDataEntryFlowProgressed.then((unsub) => {
        unsub();
      });
      this._unsubDataEntryFlowProgressed = undefined;
    }
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
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
          ${this._loading || this._step === null
            ? html`
                <step-flow-loading
                  .flowConfig=${this._params.flowConfig}
                  .hass=${this.hass}
                  .loadingReason=${this._loading}
                  .handler=${this._handler}
                  .step=${this._step}
                ></step-flow-loading>
              `
            : this._step === undefined
            ? // When we are going to next step, we render 1 round of empty
              // to reset the element.
              ""
            : html`
                <div class="dialog-actions">
                  ${([
                    "form",
                    "menu",
                    "external",
                    "progress",
                    "data_entry_flow_progressed",
                  ].includes(this._step?.type as any) &&
                    this._params.manifest?.is_built_in) ||
                  this._params.manifest?.documentation
                    ? html`
                        <a
                          href=${this._params.manifest.is_built_in
                            ? documentationUrl(
                                this.hass,
                                `/integrations/${this._params.manifest.domain}`
                              )
                            : this._params?.manifest?.documentation}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          <ha-icon-button
                            .label=${this.hass.localize("ui.common.help")}
                            .path=${mdiHelpCircle}
                          >
                          </ha-icon-button
                        ></a>
                      `
                    : ""}
                  <ha-icon-button
                    .label=${this.hass.localize(
                      "ui.panel.config.integrations.config_flow.dismiss"
                    )}
                    .path=${mdiClose}
                    dialogAction="close"
                  ></ha-icon-button>
                </div>
                ${this._step.type === "form"
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
                        .params=${this._params}
                        .step=${this._step}
                        .hass=${this.hass}
                        .domain=${this._step.handler}
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
                  : this._step.type === "menu"
                  ? html`
                      <step-flow-menu
                        .flowConfig=${this._params.flowConfig}
                        .step=${this._step}
                        .hass=${this.hass}
                      ></step-flow-menu>
                    `
                  : this._devices === undefined || this._areas === undefined
                  ? // When it's a create entry result, we will fetch device & area registry
                    html`
                      <step-flow-loading
                        .flowConfig=${this._params.flowConfig}
                        .hass=${this.hass}
                        loadingReason="loading_devices_areas"
                      ></step-flow-loading>
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
              `}
        </div>
      </ha-dialog>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.addEventListener("flow-update", (ev) => {
      const { step, stepPromise } = ev.detail;
      this._processStep(step || stepPromise);
    });
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (!changedProps.has("_step") || !this._step) {
      return;
    }
    if (["external", "progress"].includes(this._step.type)) {
      // external and progress step will send update event from the backend, so we should subscribe to them
      this._subscribeDataEntryFlowProgressed();
    }
    if (this._step.type === "create_entry") {
      if (this._step.result && this._params!.flowConfig.loadDevicesAndAreas) {
        this._fetchDevices(this._step.result.entry_id);
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

  private async _processStep(
    step: DataEntryFlowStep | undefined | Promise<DataEntryFlowStep>
  ): Promise<void> {
    if (step instanceof Promise) {
      this._loading = "loading_step";
      try {
        this._step = await step;
      } catch (err: any) {
        this.closeDialog();
        showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.integrations.config_flow.error"
          ),
          text: err?.body?.message,
        });
        return;
      } finally {
        this._loading = undefined;
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

  private _subscribeDataEntryFlowProgressed() {
    if (this._unsubDataEntryFlowProgressed) {
      return;
    }
    this._unsubDataEntryFlowProgressed = subscribeDataEntryFlowProgressed(
      this.hass.connection,
      async (ev) => {
        if (ev.data.flow_id !== this._step?.flow_id) {
          return;
        }
        this._processStep(
          this._params!.flowConfig.fetchFlow(this.hass, this._step?.flow_id)
        );
      }
    );
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
        }
        .dialog-actions {
          padding: 16px;
          position: absolute;
          top: 0;
          right: 0;
          inset-inline-start: initial;
          inset-inline-end: 0px;
          direction: var(--direction);
        }
        .dialog-actions > * {
          color: var(--secondary-text-color);
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
