import { mdiClose, mdiHelpCircle } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-dialog";
import "../../components/ha-dialog-header";
import "../../components/ha-icon-button";
import type { DataEntryFlowStep } from "../../data/data_entry_flow";
import {
  subscribeDataEntryFlowProgress,
  subscribeDataEntryFlowProgressed,
} from "../../data/data_entry_flow";
import type { DeviceRegistryEntry } from "../../data/device_registry";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import { documentationUrl } from "../../util/documentation-url";
import { showAlertDialog } from "../generic/show-dialog-box";
import type {
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
import { showOptionsFlowDialog } from "./show-dialog-options-flow";
import { showSubConfigFlowDialog } from "./show-dialog-sub-config-flow";
import { showConfigFlowDialog } from "./show-dialog-config-flow";

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
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DataEntryFlowDialogParams;

  @state() private _loading?: LoadingReason;

  @state() private _progress?: number;

  private _instance = instance;

  @state() private _step:
    | DataEntryFlowStep
    | undefined
    // Null means we need to pick a config flow
    | null;

  @state() private _handler?: string;

  private _unsubDataEntryFlowProgress?: UnsubscribeFunc;

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
    this._handler = undefined;
    if (this._unsubDataEntryFlowProgress) {
      this._unsubDataEntryFlowProgress();
      this._unsubDataEntryFlowProgress = undefined;
    }
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _devices = memoizeOne(
    (
      showDevices: boolean,
      devices: DeviceRegistryEntry[],
      entry_id?: string,
      carryOverDevices?: string[]
    ) =>
      showDevices && entry_id
        ? devices.filter(
            (device) =>
              device.config_entries.includes(entry_id) ||
              carryOverDevices?.includes(device.id)
          )
        : []
  );

  private _getDialogTitle(): string {
    if (this._loading || !this._step || !this._params) {
      return "";
    }

    switch (this._step.type) {
      case "form":
        return this._params.flowConfig.renderShowFormStepHeader(
          this.hass,
          this._step
        );
      case "abort":
        return this._params.flowConfig.renderAbortHeader
          ? this._params.flowConfig.renderAbortHeader(this.hass, this._step)
          : this.hass.localize(
              `component.${this._params.domain ?? this._step.handler}.title`
            );
      case "progress":
        return this._params.flowConfig.renderShowFormProgressHeader(
          this.hass,
          this._step
        );
      case "menu":
        return this._params.flowConfig.renderMenuHeader(this.hass, this._step);
      case "create_entry": {
        const devicesLength = this._devices(
          this._params.flowConfig.showDevices,
          Object.values(this.hass.devices),
          this._step.result?.entry_id,
          this._params.carryOverDevices
        ).length;
        return this.hass.localize(
          `ui.panel.config.integrations.config_flow.${
            devicesLength ? "device_created" : "success"
          }`,
          {
            number: devicesLength,
          }
        );
      }
      default:
        return "";
    }
  }

  private _getDialogSubtitle(): string | TemplateResult | undefined {
    if (this._loading || !this._step || !this._params) {
      return "";
    }

    switch (this._step.type) {
      case "form":
        return this._params.flowConfig.renderShowFormStepSubheader?.(
          this.hass,
          this._step
        );
      case "abort":
        return this._params.flowConfig.renderAbortSubheader?.(
          this.hass,
          this._step
        );
      case "progress":
        return this._params.flowConfig.renderShowFormProgressSubheader?.(
          this.hass,
          this._step
        );
      case "menu":
        return this._params.flowConfig.renderMenuSubheader?.(
          this.hass,
          this._step
        );
      default:
        return "";
    }
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const showDocumentationLink =
      ([
        "form",
        "menu",
        "external",
        "progress",
        "data_entry_flow_progressed",
      ].includes(this._step?.type as any) &&
        this._params.manifest?.is_built_in) ||
      !!this._params.manifest?.documentation;

    const dialogTitle = this._getDialogTitle();
    const dialogSubtitle = this._getDialogSubtitle();

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        hideActions
        .heading=${dialogTitle || true}
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
            dialogAction="close"
            slot="navigationIcon"
          ></ha-icon-button>

          <div
            slot="title"
            class="dialog-title${this._step?.type === "form" ? " form" : ""}"
            title=${dialogTitle}
          >
            ${dialogTitle}
          </div>

          ${dialogSubtitle
            ? html` <div slot="subtitle">${dialogSubtitle}</div>`
            : nothing}
          ${showDocumentationLink && !this._loading && this._step
            ? html`
                <a
                  slot="actionItems"
                  class="help"
                  href=${this._params.manifest!.is_built_in
                    ? documentationUrl(
                        this.hass,
                        `/integrations/${this._params.manifest!.domain}`
                      )
                    : this._params.manifest!.documentation}
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
            : nothing}
        </ha-dialog-header>
        <div>
          ${this._loading || this._step === null
            ? html`
                <step-flow-loading
                  .flowConfig=${this._params.flowConfig}
                  .hass=${this.hass}
                  .loadingReason=${this._loading!}
                  .handler=${this._handler}
                  .step=${this._step}
                ></step-flow-loading>
              `
            : this._step === undefined
              ? // When we are going to next step, we render 1 round of empty
                // to reset the element.
                nothing
              : html`
                  ${this._step.type === "form"
                    ? html`
                        <step-flow-form
                          narrow
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
                              .handler=${this._step.handler}
                              .domain=${this._params.domain ??
                              this._step.handler}
                            ></step-flow-abort>
                          `
                        : this._step.type === "progress"
                          ? html`
                              <step-flow-progress
                                .flowConfig=${this._params.flowConfig}
                                .step=${this._step}
                                .hass=${this.hass}
                                .progress=${this._progress}
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
                            : html`
                                <step-flow-create-entry
                                  .flowConfig=${this._params.flowConfig}
                                  .step=${this._step}
                                  .hass=${this.hass}
                                  .navigateToResult=${this._params
                                    .navigateToResult ?? false}
                                  .devices=${this._devices(
                                    this._params.flowConfig.showDevices,
                                    Object.values(this.hass.devices),
                                    this._step.result?.entry_id,
                                    this._params.carryOverDevices
                                  )}
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
  }

  private async _processStep(
    step: DataEntryFlowStep | undefined | Promise<DataEntryFlowStep>
  ): Promise<void> {
    if (step === undefined) {
      this.closeDialog();
      return;
    }

    const delayedLoading = setTimeout(() => {
      // only show loading for slow steps to avoid flickering
      this._loading = "loading_step";
    }, 250);
    let _step: DataEntryFlowStep;
    try {
      _step = await step;
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
      clearTimeout(delayedLoading);
      this._loading = undefined;
    }

    this._step = undefined;
    await this.updateComplete;
    this._step = _step;
    if (_step.type === "create_entry" && _step.next_flow) {
      // skip device rename if there is a chained flow
      if (_step.next_flow[0] === "config_flow") {
        this._step = undefined;
        this._handler = undefined;
        if (this._unsubDataEntryFlowProgress) {
          this._unsubDataEntryFlowProgress();
          this._unsubDataEntryFlowProgress = undefined;
        }
        showConfigFlowDialog(this._params!.dialogParentElement!, {
          continueFlowId: _step.next_flow[1],
          carryOverDevices: this._devices(
            this._params!.flowConfig.showDevices,
            Object.values(this.hass.devices),
            _step.result?.entry_id,
            this._params!.carryOverDevices
          ).map((device) => device.id),
        });
      } else if (_step.next_flow[0] === "options_flow") {
        this.closeDialog();
        showOptionsFlowDialog(
          this._params!.dialogParentElement!,
          _step.result!,
          {
            continueFlowId: _step.next_flow[1],
            navigateToResult: this._params!.navigateToResult,
          }
        );
      } else if (_step.next_flow[0] === "config_subentries_flow") {
        this.closeDialog();
        showSubConfigFlowDialog(
          this._params!.dialogParentElement!,
          _step.result!,
          _step.next_flow[0],
          {
            continueFlowId: _step.next_flow[1],
            navigateToResult: this._params!.navigateToResult,
          }
        );
      } else {
        this.closeDialog();
        showAlertDialog(this._params!.dialogParentElement!, {
          text: this.hass.localize(
            "ui.panel.config.integrations.config_flow.error",
            { error: `Unsupported next flow type: ${_step.next_flow[0]}` }
          ),
        });
      }
    }
  }

  private async _subscribeDataEntryFlowProgressed() {
    if (this._unsubDataEntryFlowProgress) {
      return;
    }
    this._progress = undefined;
    const unsubs = [
      subscribeDataEntryFlowProgressed(this.hass.connection, (ev) => {
        if (ev.data.flow_id !== this._step?.flow_id) {
          return;
        }
        this._processStep(
          this._params!.flowConfig.fetchFlow(this.hass, this._step.flow_id)
        );
        this._progress = undefined;
      }),
      subscribeDataEntryFlowProgress(this.hass.connection, (ev) => {
        // ha-progress-ring has an issue with 0 so we round up
        this._progress = Math.ceil(ev.data.progress * 100);
      }),
    ];
    this._unsubDataEntryFlowProgress = async () => {
      (await Promise.all(unsubs)).map((unsub) => unsub());
    };
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
        }
        .dialog-title {
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dialog-title.form {
          white-space: normal;
        }
        .help {
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
