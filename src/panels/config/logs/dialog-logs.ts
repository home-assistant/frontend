import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-dialog";
import "../../../components/input/ha-input-search";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "./error-log-card";
import type { LogsDialogParams } from "./show-dialog-logs";

@customElement("dialog-logs")
class LogsDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogParams?: LogsDialogParams;

  @state() private _open = false;

  @state() private _filter = "";

  public showDialog(dialogParams: LogsDialogParams) {
    this._dialogParams = dialogParams;
    this._open = true;
    // The log card's strings live in the config fragment, which isn't loaded on dashboards.
    this.hass.loadFragmentTranslation("config");
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed() {
    this._dialogParams = undefined;
    this._filter = "";
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._dialogParams) {
      return nothing;
    }

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this._dialogParams.title}
        width="large"
        @closed=${this._dialogClosed}
      >
        <ha-input-search
          appearance="outlined"
          .value=${this._filter}
          .placeholder=${this.hass.localize("ui.panel.config.logs.search")}
          @input=${this._filterChanged}
        ></ha-input-search>
        <error-log-card
          .hass=${this.hass}
          .header=${this._dialogParams.title}
          .provider=${this._dialogParams.provider}
          .filter=${this._filter}
        ></error-log-card>
      </ha-dialog>
    `;
  }

  private _filterChanged(ev: InputEvent) {
    this._filter = (ev.target as HTMLInputElement).value;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-input-search {
          display: block;
          margin-bottom: var(--ha-space-2);
        }
        error-log-card {
          --error-log-card-height: calc(100vh - 340px);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-logs": LogsDialog;
  }
}
