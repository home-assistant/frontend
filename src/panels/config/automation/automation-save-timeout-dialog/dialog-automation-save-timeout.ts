import type { CSSResultGroup } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-wa-dialog";
import "../../../../components/ha-spinner";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { AutomationSaveTimeoutDialogParams } from "./show-dialog-automation-save-timeout";

@customElement("ha-dialog-automation-save-timeout")
class DialogAutomationSaveTimeout extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _saveComplete = false;

  private _params!: AutomationSaveTimeoutDialogParams;

  public showDialog(params: AutomationSaveTimeoutDialogParams): void {
    this._opened = true;
    this._params = params;
    this._saveComplete = false;

    this._params.savedPromise.then(() => {
      this._saveComplete = true;
    });
  }

  public closeDialog(): void {
    this._opened = false;
  }

  private _dialogClosed() {
    this._params.onClose?.();

    if (this._opened) {
      fireEvent(this, "dialog-closed");
    }
    this._opened = false;
    return true;
  }

  protected render() {
    const title = this.hass.localize(
      "ui.panel.config.automation.editor.new_automation_setup_failed_title",
      {
        type: this.hass.localize(
          `ui.panel.config.automation.editor.type_${this._params.type}`
        ),
      }
    );

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._opened}
        header-title=${title}
        @closed=${this._dialogClosed}
      >
        <div class="content">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.new_automation_setup_failed_text",
            {
              type: this.hass.localize(
                `ui.panel.config.automation.editor.type_${this._params.type}`
              ),
              types: this.hass.localize(
                `ui.panel.config.automation.editor.type_${this._params.type}_plural`
              ),
            }
          )}
          <p></p>
          ${this.hass.localize(
            "ui.panel.config.automation.editor.new_automation_setup_keep_waiting"
          )}
          ${this._saveComplete
            ? html`<p></p>
                <ha-alert alert-type="success"
                  >${this.hass.localize(
                    "ui.panel.config.automation.editor.new_automation_setup_timedout_success"
                  )}</ha-alert
                >`
            : html`<div class="loading">
                <ha-spinner size="medium"> </ha-spinner>
              </div>`}
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="primaryAction"
            @click=${this._dialogClosed}
            variant=${this._saveComplete ? "brand" : "danger"}
          >
            ${this.hass.localize(
              `ui.common.${this._saveComplete ? "ok" : "cancel"}`
            )}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        .loading {
          display: flex;
          justify-content: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-automation-save-timeout": DialogAutomationSaveTimeout;
  }
}
