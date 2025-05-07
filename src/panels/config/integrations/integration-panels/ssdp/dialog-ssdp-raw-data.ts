import { LitElement, html, nothing, css } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { TemplateResult } from "lit";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type { HassDialog } from "../../../../../dialogs/make-dialog-manager";
import { createCloseHeading } from "../../../../../components/ha-dialog";
import type { HomeAssistant } from "../../../../../types";
import "../../../../../components/ha-code-editor";

export interface SSDPRawDataDialogParams {
  key: string;
  data: Record<string, unknown>;
}

@customElement("dialog-ssdp-raw-data")
class DialogSSDPRawData extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: SSDPRawDataDialogParams;

  public async showDialog(params: SSDPRawDataDialogParams): Promise<void> {
    this._params = params;
  }

  public closeDialog(): boolean {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
    return true;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          `${this.hass.localize("ui.panel.config.ssdp.raw_data_title")}: ${this._params.key}`
        )}
      >
        <div class="content">
          <ha-code-editor
            mode="yaml"
            .value=${JSON.stringify(this._params.data, null, 2)}
            readonly
            autofocus
          ></ha-code-editor>
        </div>
      </ha-dialog>
    `;
  }

  static styles = css`
    ha-code-editor {
      --code-mirror-max-height: 60vh;
      --code-mirror-height: auto;
    }
    .content {
      margin: 0;
      padding: 0;
      display: block;
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-ssdp-raw-data": DialogSSDPRawData;
  }
}
