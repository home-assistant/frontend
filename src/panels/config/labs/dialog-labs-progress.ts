import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-wa-dialog";
import "../../../components/ha-spinner";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import type { HomeAssistant } from "../../../types";
import type { LabsProgressDialogParams } from "./show-dialog-labs-progress";

@customElement("dialog-labs-progress")
export class DialogLabsProgress
  extends LitElement
  implements HassDialog<LabsProgressDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: LabsProgressDialogParams;

  @state() private _open = false;

  public async showDialog(params: LabsProgressDialogParams): Promise<void> {
    this._params = params;
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _handleClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        prevent-scrim-close
        @closed=${this._handleClosed}
      >
        <div slot="header"></div>
        <div class="summary">
          <ha-spinner></ha-spinner>
          <div class="content">
            <p class="heading">
              ${this.hass.localize(
                "ui.panel.config.labs.progress.creating_backup"
              )}
            </p>
            <p class="description">
              ${this.hass.localize(
                this._params.enabled
                  ? "ui.panel.config.labs.progress.backing_up_before_enabling"
                  : "ui.panel.config.labs.progress.backing_up_before_disabling"
              )}
            </p>
          </div>
        </div>
      </ha-wa-dialog>
    `;
  }

  static readonly styles = css`
    ha-wa-dialog {
      --dialog-content-padding: var(--ha-space-6);
    }

    .summary {
      display: flex;
      flex-direction: row;
      column-gap: var(--ha-space-4);
      align-items: center;
      justify-content: center;
      padding: var(--ha-space-4) 0;
    }
    ha-spinner {
      --ha-spinner-size: 60px;
      flex-shrink: 0;
    }
    .content {
      flex: 1;
      min-width: 0;
    }
    .heading {
      font-size: var(--ha-font-size-xl);
      line-height: var(--ha-line-height-condensed);
      color: var(--primary-text-color);
      margin: 0 0 var(--ha-space-1);
    }
    .description {
      font-size: var(--ha-font-size-m);
      line-height: var(--ha-line-height-condensed);
      letter-spacing: 0.25px;
      color: var(--secondary-text-color);
      margin: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-labs-progress": DialogLabsProgress;
  }
}
