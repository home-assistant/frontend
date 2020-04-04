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
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "../../components/dialog/ha-paper-dialog";
import "../../components/ha-code-editor";
// Not duplicate, is for typing
// tslint:disable-next-line
import { HaPaperDialog } from "../../components/dialog/ha-paper-dialog";

import { PolymerChangedEvent } from "../../polymer-types";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { ZHADeviceZigbeeInfoDialogParams } from "./show-dialog-zha-device-zigbee-info";
// tslint:disable-next-line: no-duplicate-imports
import { HaCodeEditor } from "../../components/ha-code-editor";
import { afterNextRender } from "../../common/util/render-status";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("dialog-zha-device-zigbee-info")
class DialogZHADeviceZigbeeInfo extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _params?: ZHADeviceZigbeeInfoDialogParams;
  @property() private _error?: string;
  @property() private _signature: any;
  @query("ha-code-editor") private _codeEditor?: HaCodeEditor;
  @query("ha-paper-dialog") private _dialog!: HaPaperDialog;

  public async showDialog(
    params: ZHADeviceZigbeeInfoDialogParams
  ): Promise<void> {
    this._params = params;
    const signature = JSON.parse(JSON.stringify(this._params.device.signature));
    signature.manufacturer = this._params.device.manufacturer;
    signature.model = this._params.device.model;
    this._signature = JSON.stringify(signature, undefined, 2);
    await this.updateComplete;
    this._dialog.open();
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
      <ha-paper-dialog
        with-backdrop
        opened
        autofocus
        @opened-changed=${this._openedChanged}
      >
        ${this._error
          ? html`
              <div class="error">${this._error}</div>
            `
          : html`
              <paper-dialog-scrollable>
                <ha-code-editor
                  mode="yaml"
                  .value="${this._signature}"
                  .hass=${this.hass}
                >
                </ha-code-editor>
              </paper-dialog-scrollable>
            `}
      </ha-paper-dialog>
    `;
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!ev.detail.value) {
      this._params = undefined;
      this._error = undefined;
      this._signature = undefined;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-paper-dialog > * {
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
