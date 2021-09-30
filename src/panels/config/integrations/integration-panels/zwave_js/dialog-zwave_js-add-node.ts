import "@material/mwc-button/mwc-button";
import { mdiAlertCircle, mdiCheckCircle, mdiCloseCircle } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-circular-progress";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-switch";
import {
  grantSecurityClasses,
  InclusionStrategy,
  RequestedGrant,
  SecurityClass,
  stopInclusion,
  subscribeAddNode,
  validateDskAndEnterPin,
} from "../../../../../data/zwave_js";
import { haStyle, haStyleDialog } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";
import { ZWaveJSAddNodeDialogParams } from "./show-dialog-zwave_js-add-node";
import "../../../../../components/ha-radio";
import { HaCheckbox } from "../../../../../components/ha-checkbox";
import "../../../../../components/ha-alert";

export interface ZWaveJSAddNodeDevice {
  id: string;
  name: string;
}

@customElement("dialog-zwave_js-add-node")
class DialogZWaveJSAddNode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _entryId?: string;

  @state() private _status?:
    | "loading"
    | "started"
    | "choose_strategy"
    | "interviewing"
    | "failed"
    | "timed_out"
    | "finished"
    | "validate_dsk_enter_pin"
    | "grant_security_classes";

  @state() private _device?: ZWaveJSAddNodeDevice;

  @state() private _stages?: string[];

  @state() private _inclusionStrategy?: InclusionStrategy;

  @state() private _dsk?: string;

  @state() private _error?: string;

  @state() private _requestedGrant?: RequestedGrant;

  @state() private _securityClasses: SecurityClass[] = [];

  @state() private _lowSecurity = false;

  private _addNodeTimeoutHandle?: number;

  private _subscribed?: Promise<UnsubscribeFunc>;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe();
  }

  public async showDialog(params: ZWaveJSAddNodeDialogParams): Promise<void> {
    this._entryId = params.entry_id;
    this._status = "loading";
    this._startInclusion();
  }

  @query("#pin-input") private _pinInput?: PaperInputElement;

  protected render(): TemplateResult {
    if (!this._entryId) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize("ui.panel.config.zwave_js.add_node.title")
        )}
      >
        ${this._status === "loading"
          ? html`<div style="display: flex; justify-content: center;">
              <ha-circular-progress size="large" active></ha-circular-progress>
            </div>`
          : this._status === "choose_strategy"
          ? html`<h3>Choose strategy</h3>
              <div class="flex-column">
                <ha-formfield
                  .label=${html`<b>Secure if possible</b>
                    <div class="secondary">
                      Requires user interaction during inclusion. Fast and
                      secure with S2 when supported. Fallback to legacy S0 or no
                      encryption when necessary.
                    </div>`}
                >
                  <ha-radio
                    name="strategy"
                    @change=${this._handleStrategyChange}
                    .value=${InclusionStrategy.Default}
                    .checked=${this._inclusionStrategy ===
                      InclusionStrategy.Default ||
                    this._inclusionStrategy === undefined}
                  >
                  </ha-radio>
                </ha-formfield>
                <ha-formfield
                  .label=${html`<b>Legacy Secure</b>
                    <div class="secondary">
                      Uses the older S0 security that is secure, but slow due to
                      a lot of overhead. Allows securely including S2 capable
                      devices which fail to be included with S2.
                    </div>`}
                >
                  <ha-radio
                    name="strategy"
                    @change=${this._handleStrategyChange}
                    .value=${InclusionStrategy.Security_S0}
                    .checked=${this._inclusionStrategy ===
                    InclusionStrategy.Security_S0}
                  >
                  </ha-radio>
                </ha-formfield>
                <ha-formfield
                  .label=${html`<b>Insecure</b>
                    <div class="secondary">Do not use encryption.</div>`}
                >
                  <ha-radio
                    name="strategy"
                    @change=${this._handleStrategyChange}
                    .value=${InclusionStrategy.Insecure}
                    .checked=${this._inclusionStrategy ===
                    InclusionStrategy.Insecure}
                  >
                  </ha-radio>
                </ha-formfield>
              </div>
              <mwc-button
                slot="primaryAction"
                @click=${this._startManualInclusion}
              >
                Search device
              </mwc-button>`
          : this._status === "validate_dsk_enter_pin"
          ? html`
                <p>
                  Please enter the 5-digit PIN for your device and verify that
                  the rest of the device-specific key matches the one that can
                  be found on your device or the manual.
                </p>
                ${
                  this._error
                    ? html`<ha-alert alert-type="error"
                        >${this._error}</ha-alert
                      >`
                    : ""
                }
                <div class="flex-container">
                <paper-input
                  label="PIN"
                  id="pin-input"
                  @keyup=${this._handlePinKeyUp}
                  no-label-float
                ></paper-input>
                ${this._dsk}
                </div>
                <mwc-button
                  slot="primaryAction"
                  @click=${this._validateDskAndEnterPin}
                >
                  Submit
                </mwc-button>
              </div>
            `
          : this._status === "grant_security_classes"
          ? html`
              <h3>The device has requested the following security classes:</h3>
              ${this._error
                ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
                : ""}
              <div class="flex-column">
                ${this._requestedGrant?.securityClasses
                  .sort()
                  .reverse()
                  .map(
                    (securityClass) => html`<ha-formfield
                      .label=${html`<b
                          >${this.hass.localize(
                            `ui.panel.config.zwave_js.add_node.security_classes.${SecurityClass[securityClass]}.title`
                          )}</b
                        >
                        <div class="secondary">
                          ${this.hass.localize(
                            `ui.panel.config.zwave_js.add_node.security_classes.${SecurityClass[securityClass]}.description`
                          )}
                        </div>`}
                    >
                      <ha-checkbox
                        @change=${this._handleSecurityClassChange}
                        .value=${securityClass}
                        .checked=${this._securityClasses.includes(
                          securityClass
                        )}
                      >
                      </ha-checkbox>
                    </ha-formfield>`
                  )}
              </div>
              <mwc-button
                slot="primaryAction"
                .disabled=${!this._securityClasses.length}
                @click=${this._grantSecurityClasses}
              >
                Submit
              </mwc-button>
            `
          : this._status === "timed_out"
          ? html`
              <h3>Timed out!</h3>
              <p>
                We have not found any device in inclusion mode. Make sure the
                device is active and in inclusion mode.
              </p>
              <mwc-button slot="primaryAction" @click=${this._startInclusion}>
                Retry
              </mwc-button>
            `
          : this._status === "started"
          ? html`
              <div class="flex-container">
                <ha-circular-progress active></ha-circular-progress>
                <div class="status">
                  <p>
                    <b
                      >${this.hass.localize(
                        "ui.panel.config.zwave_js.add_node.controller_in_inclusion_mode"
                      )}</b
                    >
                  </p>
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.add_node.follow_device_instructions"
                    )}
                  </p>
                  <p>
                    <button
                      class="link"
                      @click=${this._chooseInclusionStrategy}
                    >
                      Advanced inclusion
                    </button>
                  </p>
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.add_node.cancel_inclusion"
                )}
              </mwc-button>
            `
          : this._status === "interviewing"
          ? html`
              <div class="flex-container">
                <ha-circular-progress active></ha-circular-progress>
                <div class="status">
                  <p>
                    <b
                      >${this.hass.localize(
                        "ui.panel.config.zwave_js.add_node.interview_started"
                      )}</b
                    >
                  </p>
                  ${this._stages
                    ? html` <div class="stages">
                        ${this._stages.map(
                          (stage) => html`
                            <span class="stage">
                              <ha-svg-icon
                                .path=${mdiCheckCircle}
                                class="success"
                              ></ha-svg-icon>
                              ${stage}
                            </span>
                          `
                        )}
                      </div>`
                    : ""}
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.panel.config.zwave_js.common.close")}
              </mwc-button>
            `
          : this._status === "failed"
          ? html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${mdiCloseCircle}
                  class="failed"
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.add_node.inclusion_failed"
                    )}
                  </p>
                  ${this._stages
                    ? html` <div class="stages">
                        ${this._stages.map(
                          (stage) => html`
                            <span class="stage">
                              <ha-svg-icon
                                .path=${mdiCheckCircle}
                                class="success"
                              ></ha-svg-icon>
                              ${stage}
                            </span>
                          `
                        )}
                      </div>`
                    : ""}
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.panel.config.zwave_js.common.close")}
              </mwc-button>
            `
          : this._status === "finished"
          ? html`
              <div class="flex-container">
                <ha-svg-icon
                  .path=${this._lowSecurity ? mdiAlertCircle : mdiCheckCircle}
                  class=${this._lowSecurity ? "warning" : "success"}
                ></ha-svg-icon>
                <div class="status">
                  <p>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.add_node.inclusion_finished"
                    )}
                  </p>
                  ${this._lowSecurity
                    ? html`<ha-alert
                        alert-type="warning"
                        title="The device was added insecurely"
                      >
                        There was an error during secure inclusion. You can try
                        again by excluding the device and adding it again.
                      </ha-alert>`
                    : ""}
                  <a href=${`/config/devices/device/${this._device!.id}`}>
                    <mwc-button>
                      ${this.hass.localize(
                        "ui.panel.config.zwave_js.add_node.view_device"
                      )}
                    </mwc-button>
                  </a>
                  ${this._stages
                    ? html` <div class="stages">
                        ${this._stages.map(
                          (stage) => html`
                            <span class="stage">
                              <ha-svg-icon
                                .path=${mdiCheckCircle}
                                class="success"
                              ></ha-svg-icon>
                              ${stage}
                            </span>
                          `
                        )}
                      </div>`
                    : ""}
                </div>
              </div>
              <mwc-button slot="primaryAction" @click=${this.closeDialog}>
                ${this.hass.localize("ui.panel.config.zwave_js.common.close")}
              </mwc-button>
            `
          : ""}
      </ha-dialog>
    `;
  }

  private _chooseInclusionStrategy(): void {
    this._unsubscribe();
    this._status = "choose_strategy";
  }

  private _handleStrategyChange(ev: CustomEvent): void {
    this._inclusionStrategy = (ev.target as any).value;
  }

  private _handleSecurityClassChange(ev: CustomEvent): void {
    const checkbox = ev.currentTarget as HaCheckbox;
    const securityClass = Number(checkbox.value);
    if (checkbox.checked && !this._securityClasses.includes(securityClass)) {
      this._securityClasses = [...this._securityClasses, securityClass];
    } else if (!checkbox.checked) {
      this._securityClasses = this._securityClasses.filter(
        (val) => val !== securityClass
      );
    }
  }

  private _handlePinKeyUp(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      this._validateDskAndEnterPin();
    }
  }

  private async _validateDskAndEnterPin(): Promise<void> {
    this._status = "loading";
    this._error = undefined;
    try {
      await validateDskAndEnterPin(
        this.hass,
        this._entryId!,
        this._pinInput!.value as string
      );
    } catch (err: any) {
      this._error = err.message;
      this._status = "validate_dsk_enter_pin";
    }
  }

  private async _grantSecurityClasses(): Promise<void> {
    this._status = "loading";
    this._error = undefined;
    try {
      await grantSecurityClasses(
        this.hass,
        this._entryId!,
        this._securityClasses
      );
    } catch (err: any) {
      this._error = err.message;
      this._status = "grant_security_classes";
    }
  }

  private _startManualInclusion() {
    if (!this._inclusionStrategy) {
      this._inclusionStrategy = InclusionStrategy.Default;
    }
    this._startInclusion();
  }

  private _startInclusion(): void {
    if (!this.hass) {
      return;
    }
    this._lowSecurity = false;
    this._subscribed = subscribeAddNode(
      this.hass,
      this._entryId!,
      (message) => {
        if (message.event === "inclusion started") {
          this._status = "started";
        }
        if (message.event === "inclusion failed") {
          this._unsubscribe();
          this._status = "failed";
        }
        if (message.event === "inclusion stopped") {
          // We either found a device, or it failed, either way, cancel the timeout as we are no longer searching
          if (this._addNodeTimeoutHandle) {
            clearTimeout(this._addNodeTimeoutHandle);
          }
          this._addNodeTimeoutHandle = undefined;
        }

        if (message.event === "validate dsk and enter pin") {
          this._status = "validate_dsk_enter_pin";
          this._dsk = message.dsk;
        }

        if (message.event === "grant security classes") {
          if (this._inclusionStrategy === undefined) {
            grantSecurityClasses(
              this.hass,
              this._entryId!,
              message.requested_grant.securityClasses,
              message.requested_grant.clientSideAuth
            );
            return;
          }
          this._requestedGrant = message.requested_grant;
          this._securityClasses = message.requested_grant.securityClasses;
          this._status = "grant_security_classes";
        }

        if (message.event === "device registered") {
          this._device = message.device;
        }
        if (message.event === "node added") {
          this._status = "interviewing";
          this._lowSecurity = message.node.low_security;
        }

        if (message.event === "interview completed") {
          this._unsubscribe();
          this._status = "finished";
        }

        if (message.event === "interview stage completed") {
          if (this._stages === undefined) {
            this._stages = [message.stage];
          } else {
            this._stages = [...this._stages, message.stage];
          }
        }
      },
      this._inclusionStrategy
    );
    this._addNodeTimeoutHandle = window.setTimeout(() => {
      this._unsubscribe();
      this._status = "timed_out";
    }, 90000);
  }

  private _unsubscribe(): void {
    if (this._subscribed) {
      this._subscribed.then((unsub) => unsub());
      this._subscribed = undefined;
    }
    if (this._entryId) {
      stopInclusion(this.hass, this._entryId);
    }
    this._requestedGrant = undefined;
    this._dsk = undefined;
    this._securityClasses = [];
    this._status = undefined;
    if (this._addNodeTimeoutHandle) {
      clearTimeout(this._addNodeTimeoutHandle);
    }
    this._addNodeTimeoutHandle = undefined;
  }

  public closeDialog(): void {
    this._unsubscribe();
    this._inclusionStrategy = undefined;
    this._entryId = undefined;
    this._status = undefined;
    this._device = undefined;
    this._stages = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      haStyle,
      css`
        h3 {
          margin-top: 0;
        }

        .success {
          color: var(--success-color);
        }

        .warning {
          color: var(--warning-color);
        }

        .failed {
          color: var(--error-color);
        }

        .stages {
          margin-top: 16px;
          display: grid;
        }

        .flex-container .stage ha-svg-icon {
          width: 16px;
          height: 16px;
          margin-right: 0px;
        }
        .stage {
          padding: 8px;
        }

        .flex-container {
          display: flex;
          align-items: center;
        }

        .flex-column {
          display: flex;
          flex-direction: column;
        }

        .flex-column ha-formfield {
          padding: 8px 0;
        }

        ha-svg-icon {
          width: 68px;
          height: 48px;
        }
        .secondary {
          color: var(--secondary-text-color);
        }

        .flex-container ha-circular-progress,
        .flex-container ha-svg-icon {
          margin-right: 20px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zwave_js-add-node": DialogZWaveJSAddNode;
  }
}
