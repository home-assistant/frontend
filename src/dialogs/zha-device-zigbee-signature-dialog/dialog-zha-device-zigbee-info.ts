import {
  LitElement,
  html,
  css,
  CSSResult,
  TemplateResult,
  customElement,
  property,
  query,
} from "lit-element";
import "../../components/ha-code-editor";
import "../../components/ha-dialog";

import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { ZHADeviceZigbeeInfoDialogParams } from "./show-dialog-zha-device-zigbee-info";
// tslint:disable-next-line: no-duplicate-imports
import { HaCodeEditor } from "../../components/ha-code-editor";
import { afterNextRender } from "../../common/util/render-status";
import { fireEvent } from "../../common/dom/fire_event";
// tslint:disable-next-line: no-duplicate-imports
import { HaDialog } from "../../components/ha-dialog";

@customElement("dialog-zha-device-zigbee-info")
class DialogZHADeviceZigbeeInfo extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _params?: ZHADeviceZigbeeInfoDialogParams;
  @property() private _error?: string;
  @property() private _signature: any;
  @query("ha-code-editor") private _codeEditor?: HaCodeEditor;
  @query("ha-dialog") private _dialog!: HaDialog;

  public async showDialog(
    params: ZHADeviceZigbeeInfoDialogParams
  ): Promise<void> {
    this._params = params;
    const signature = JSON.parse(JSON.stringify(this._params.device.signature));
    signature.manufacturer = this._params.device.manufacturer;
    signature.model = this._params.device.model;
    this._signature = JSON.stringify(signature, undefined, 2);
    await this.updateComplete;
    afterNextRender(() => {
      if (this._codeEditor?.codemirror) {
        this._codeEditor.codemirror.refresh();
      }
      afterNextRender(() =>
        fireEvent(this._dialog as HTMLElement, "iron-resize")
      );
    });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        hideActions
        @closing="${this._close}"
        .heading=${this.hass.localize(
          `ui.dialogs.zha_device_info.device_signature`
        )}
      >
        ${this._error
          ? html`
              <div class="error">${this._error}</div>
            `
          : html`
              <ha-code-editor
                mode="yaml"
                .value=${this._signature}
                .hass=${this.hass}
              >
              </ha-code-editor>
            `}
      </ha-dialog>
    `;
  }

  private _close(): void {
    this._params = undefined;
    this._error = undefined;
    this._signature = undefined;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-dialog > * {
          margin: 0;
          display: block;
          padding: 0;
          min-width: 400px;
          max-width: 600px;
        }
        .error {
          color: var(--google-red-500);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zha-device-zigbee-info": DialogZHADeviceZigbeeInfo;
  }
}
