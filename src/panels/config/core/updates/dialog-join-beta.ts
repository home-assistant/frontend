import { mdiOpenInNew } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-wa-dialog";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { documentationUrl } from "../../../../util/documentation-url";
import type { JoinBetaDialogParams } from "./show-dialog-join-beta";

@customElement("dialog-join-beta")
export class DialogJoinBeta
  extends LitElement
  implements HassDialog<JoinBetaDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogParams?: JoinBetaDialogParams;

  @state() private _open = false;

  public showDialog(dialogParams: JoinBetaDialogParams): void {
    this._dialogParams = dialogParams;
    this._open = true;
  }

  public closeDialog() {
    this._open = false;
    return true;
  }

  private _dialogClosed() {
    this._dialogParams = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._dialogParams) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize("ui.dialogs.join_beta_channel.title")}
        @closed=${this._dialogClosed}
      >
        <ha-alert alert-type="warning">
          ${this.hass.localize("ui.dialogs.join_beta_channel.backup")}
        </ha-alert>
        <p>
          ${this.hass.localize("ui.dialogs.join_beta_channel.warning")}.<br />
          ${this.hass.localize("ui.dialogs.join_beta_channel.release_items")}
        </p>
        <ul>
          <li>Home Assistant Core</li>
          <li>Home Assistant Supervisor</li>
          <li>Home Assistant Operating System</li>
        </ul>
        <a
          href=${documentationUrl(this.hass!, "/faq/release/")}
          target="_blank"
          rel="noreferrer"
        >
          ${this.hass!.localize(
            "ui.dialogs.join_beta_channel.view_documentation"
          )}
          <ha-svg-icon .path=${mdiOpenInNew}></ha-svg-icon>
        </a>
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this._cancel}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button slot="primaryAction" @click=${this._join}>
            ${this.hass.localize("ui.dialogs.join_beta_channel.join")}
          </ha-button>
        </ha-dialog-footer>
      </ha-wa-dialog>
    `;
  }

  private _cancel() {
    this._dialogParams?.cancel?.();
    this.closeDialog();
  }

  private _join() {
    this._dialogParams?.join?.();
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        a {
          text-decoration: none;
        }
        a ha-svg-icon {
          --mdc-icon-size: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-join-beta": DialogJoinBeta;
  }
}
