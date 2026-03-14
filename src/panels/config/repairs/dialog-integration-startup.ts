import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-wa-dialog";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "./integrations-startup-time";

@customElement("dialog-integration-startup")
class DialogIntegrationStartup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  public showDialog(): void {
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._open = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._open) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.repairs.integration_startup_time"
        )}
        @closed=${this._dialogClosed}
      >
        <integrations-startup-time
          .hass=${this.hass}
          narrow
        ></integrations-startup-time>
      </ha-wa-dialog>
    `;
  }

  static styles: CSSResultGroup = [
    haStyleDialog,
    css`
      ha-wa-dialog {
        --dialog-content-padding: 0;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-integration-startup": DialogIntegrationStartup;
  }
}
